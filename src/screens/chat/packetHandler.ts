import React from 'react'
import { Status } from './ChatScreen'
import { MinecraftChat, parseValidJson } from '../../minecraft/chatToJsx'
import { ServerConnection } from '../../minecraft/connection'
import {
  concatPacketData,
  Packet,
  PacketDataTypes
} from '../../minecraft/packet'
import { protocolMap, readVarInt, writeVarInt } from '../../minecraft/utils'
import { makeChatMessagePacket } from '../../minecraft/packets/chat'

export const enderChatPrefix = '\u00A74[\u00A7cEnderChat\u00A74] \u00A7c'
export const parseMessageError = 'An error occurred when parsing chat.'
export const clientSettingsError =
  'An error occurred when sending client settings.'
export const inventoryCloseError =
  'An error occurred when closing an inventory window.'
export const respawnError =
  'An error occurred when trying to respawn after death.'
export const deathRespawnMessage = enderChatPrefix + 'You died! Respawning...'
export const sendMessageError = 'Failed to send message to server!'
export const healthMessage =
  enderChatPrefix + "You're losing health! \u00A7b%prev \u00A7f-> \u00A7c%new"

type HandleError = (
  addMsg: (text: MinecraftChat) => void,
  translated: string
) => (error: unknown) => any

interface PlayerChatMessage {
  signedChat: string
  unsignedChat?: string
  type: number
  displayName: string
}

const parsePlayerChatMessage = (data: Buffer): PlayerChatMessage => {
  const [signedChatLength, signedChatVarIntLength] = readVarInt(data)
  data = data.slice(signedChatVarIntLength)
  const signedChat = data.slice(0, signedChatLength).toString('utf8')
  data = data.slice(signedChatLength)
  const hasUnsignedChat = data.readInt8()
  data = data.slice(1)
  let unsignedChat
  if (hasUnsignedChat) {
    const [unsignedChatLength, unsignedChatVarIntLength] = readVarInt(data)
    data = data.slice(unsignedChatVarIntLength)
    unsignedChat = data.slice(0, unsignedChatLength).toString('utf8')
    data = data.slice(unsignedChatLength)
  }
  const [type, typeLength] = readVarInt(data)
  data = data.slice(typeLength)
  data = data.slice(16) // Skip sender UUID
  const [displayNameLength, displayNameVarIntLength] = readVarInt(data)
  data = data.slice(displayNameVarIntLength)
  const displayName = data.slice(0, displayNameLength).toString('utf8')
  return { signedChat, unsignedChat, type, displayName }
}

const handleSystemMessage = (
  packet: Packet,
  addMessage: (text: MinecraftChat) => void,
  handleError: HandleError,
  is1191: boolean
) => {
  try {
    const [chatLength, chatVarIntLength] = readVarInt(packet.data)
    const chatJson = packet.data
      .slice(chatVarIntLength, chatVarIntLength + chatLength)
      .toString('utf8')
    // TODO: Support position 2 (action bar), true (action bar) and sender for disableChat/blocked players.
    // TODO-1.19: 3 say command, 4 msg command, 5 team msg command, 6 emote command, 7 tellraw command, also in Player Chat Message.
    const position = packet.data.readInt8(chatVarIntLength + chatLength)
    if (!is1191 && (position === 0 || position === 1)) {
      addMessage(parseValidJson(chatJson))
    } else if (is1191 && !position) {
      addMessage(parseValidJson(chatJson))
    }
  } catch (e) {
    handleError(addMessage, parseMessageError)(e)
  }
}

export const packetHandler =
  (
    healthRef: React.MutableRefObject<number | null>,
    statusRef: React.MutableRefObject<Status>,
    setLoading: React.Dispatch<React.SetStateAction<string>>,
    connection: ServerConnection,
    addMessage: (text: MinecraftChat) => any,
    joinMessage: string,
    sendJoinMessage: boolean,
    sendSpawnCommand: boolean,
    handleError: HandleError,
    charLimit: number
  ) =>
  (packet: Packet) => {
    const { protocolVersion } = connection.options
    if (statusRef.current === 'CONNECTING' && connection.loggedIn) {
      setLoading('')
      statusRef.current = 'CONNECTED'
      const messageToSend = joinMessage.substring(0, charLimit).trim()
      if (sendJoinMessage && messageToSend) {
        connection
          .writePacket(...makeChatMessagePacket(messageToSend, protocolVersion))
          .catch(handleError(addMessage, sendMessageError))
      }
      if (sendSpawnCommand) {
        connection
          .writePacket(...makeChatMessagePacket('/spawn', protocolVersion))
          .catch(handleError(addMessage, sendMessageError))
      }
    }

    const is117 = protocolVersion >= protocolMap[1.17]
    const is118 = protocolVersion >= protocolMap[1.18]
    const is119 = protocolVersion >= protocolMap[1.19]
    const is1191 = protocolVersion >= protocolMap['1.19.1']
    if (
      /* Login (play) */
      (packet.id === 0x24 && !is117) ||
      (packet.id === 0x26 && is117 && !is119) ||
      (packet.id === 0x23 && is119 && !is1191) ||
      (packet.id === 0x25 && is1191)
    ) {
      // Send Client Settings packet.
      const clientSettingsId = is119 ? (is1191 ? 0x08 : 0x07) : 0x05
      const viewDistance = Buffer.alloc(1)
      viewDistance.writeInt8(2)
      const skinParts = Buffer.alloc(1)
      skinParts.writeUInt8(0b11111111)
      // TODO: Intl in future? And other setting changes too.
      const packetData: PacketDataTypes[] = [
        'en_US',
        viewDistance,
        writeVarInt(0),
        true,
        skinParts,
        writeVarInt(1)
      ]
      if (is117) packetData.push(!is118)
      if (is118) packetData.push(true)
      connection
        .writePacket(clientSettingsId, concatPacketData(packetData))
        .catch(handleError(addMessage, clientSettingsError))
    } else if (
      /* Respawn */
      (packet.id === 0x39 && !is117) ||
      (packet.id === 0x3d && is117 && !is119) ||
      (packet.id === 0x3b && is119 && !is1191) ||
      (packet.id === 0x3e && is1191)
    ) {
      // Send spawn command when switching worlds.
      if (sendSpawnCommand) {
        connection
          .writePacket(...makeChatMessagePacket('/spawn', protocolVersion))
          .catch(handleError(addMessage, sendMessageError))
      }
    } else if (
      /* Chat Message (clientbound) */
      (packet.id === 0x0e && !is117) ||
      (packet.id === 0x0f && is117 && !is119)
    ) {
      handleSystemMessage(packet, addMessage, handleError, is1191)
    } else if (
      /* System Chat Message (clientbound) */
      (packet.id === 0x5f && is119 && !is1191) ||
      (packet.id === 0x62 && is1191)
    ) {
      handleSystemMessage(packet, addMessage, handleError, is1191)
    } else if (
      /* Player Chat Message (clientbound) */
      (packet.id === 0x30 && is119 && !is1191) ||
      (packet.id === 0x33 && is1191)
    ) {
      try {
        const { type, displayName, signedChat, unsignedChat } =
          parsePlayerChatMessage(packet.data)
        // TODO-1.19: Support sender team name
        if (type === 0 || type === 1) {
          addMessage({
            translate: 'chat.type.text',
            with: [
              parseValidJson(displayName),
              parseValidJson(unsignedChat ?? signedChat)
            ]
          })
        }
      } catch (e) {
        handleError(addMessage, parseMessageError)(e)
      }
    } else if (
      /* Open Window */
      (packet.id === 0x2e && !is119) ||
      (packet.id === 0x2b && is119 && !is1191) ||
      (packet.id === 0x2d && is119)
    ) {
      // Just close the window.
      const [windowId] = readVarInt(packet.data)
      const buf = Buffer.alloc(1)
      buf.writeUInt8(windowId)
      connection // Close Window (serverbound)
        .writePacket(is1191 ? 0x0c : is119 ? 0x0b : is117 ? 0x09 : 0x0a, buf)
        .catch(handleError(addMessage, inventoryCloseError))
    } else if (
      /* Death Combat Event */
      (packet.id === 0x31 && !is117) ||
      (packet.id === 0x35 && is117 && !is119) ||
      (packet.id === 0x33 && is119 && !is1191) ||
      (packet.id === 0x36 && is1191)
    ) {
      let data = packet.data
      if (!is117) {
        const [action, actionLen] = readVarInt(data)
        if (action !== 2) return
        data = data.slice(actionLen)
      }
      data = data.slice(readVarInt(data)[1] + 4) // Remove Player/Entity ID
      const [chatLen, chatViLength] = readVarInt(data)
      const deathMessage = parseValidJson(
        data.slice(chatViLength, chatViLength + chatLen).toString('utf8')
      )
      if (
        (typeof deathMessage === 'string' && deathMessage.trim()) ||
        deathMessage?.text ||
        deathMessage?.extra?.length > 0
      ) {
        addMessage(deathMessage)
      }
      // Automatically respawn.
      // LOW-TODO: Should this be manual, or a dialog, like MC?
      addMessage(deathRespawnMessage)
      connection // Client Status
        .writePacket(is1191 ? 0x07 : is119 ? 0x06 : 0x04, writeVarInt(0))
        .catch(handleError(addMessage, respawnError))
    } else if (
      /* Update Health */
      (packet.id === 0x49 && !is117) ||
      (packet.id === 0x52 && is117 && !is1191) ||
      (packet.id === 0x55 && is1191)
    ) {
      const newHealth = packet.data.readFloatBE(0)
      if (healthRef.current != null && healthRef.current > newHealth) {
        const info = healthMessage
          .replace('%prev', healthRef.current.toString())
          .replace('%new', newHealth.toString())
        addMessage(info)
      } // LOW-TODO: Long-term it would be better to have a UI.
      healthRef.current = newHealth
    }
  }
