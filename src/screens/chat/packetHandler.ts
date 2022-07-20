import React from 'react'
import { MinecraftChat, parseValidJson } from '../../minecraft/chatToJsx'
import { ServerConnection } from '../../minecraft/connection'
import { concatPacketData, Packet } from '../../minecraft/packet'
import { protocolMap, readVarInt, writeVarInt } from '../../minecraft/utils'

const enderChatPrefix = '\u00A74[\u00A7cEnderChat\u00A74] \u00A7c'
const parseMessageErr = 'An error occurred when parsing chat.'
const inventoryCloseErr = 'An error occurred when closing an inventory window.'
const respawnErr = 'An error occurred when trying to respawn after death.'
const deathRespawnMessage = enderChatPrefix + 'You died! Respawning...'
const sendMessageErr = 'Failed to send message to server!'
const healthMessage =
  enderChatPrefix + "You're losing health! \u00A7b%prev \u00A7f-> \u00A7c%new"

export default (
    healthRef: React.MutableRefObject<number | null>,
    loggedInRef: React.MutableRefObject<boolean>,
    setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>,
    connection: ServerConnection,
    addMessage: (text: MinecraftChat) => any,
    joinMessage: string,
    sendJoinMessage: boolean,
    sendSpawnCommand: boolean,
    handleError: (
      addMsg: (text: MinecraftChat) => void,
      translated: string
    ) => (error: unknown) => any,
    charLimit: number
  ) =>
  (packet: Packet) => {
    if (!loggedInRef.current && connection.loggedIn) {
      setLoggedIn(true)
      loggedInRef.current = true
      if (sendJoinMessage) {
        connection
          .writePacket(
            0x03,
            concatPacketData([joinMessage.substring(0, charLimit)])
          )
          .catch(handleError(addMessage, sendMessageErr))
      }
      if (sendSpawnCommand) {
        connection
          .writePacket(0x03, concatPacketData(['/spawn']))
          .catch(handleError(addMessage, sendMessageErr))
      }
    }

    const is119 = connection.options.protocolVersion >= protocolMap['1.19']
    if (packet.id === 0x0f /* Chat Message (clientbound) */ && !is119) {
      try {
        const [chatLength, chatVarIntLength] = readVarInt(packet.data)
        const chatJson = packet.data
          .slice(chatVarIntLength, chatVarIntLength + chatLength)
          .toString('utf8')
        const position = packet.data.readInt8(chatVarIntLength + chatLength)
        // TODO: Support position 2 (also in 0x5f packet) and sender for disableChat/blocked players.
        if (position === 0 || position === 1) {
          addMessage(parseValidJson(chatJson))
        }
      } catch (e) {
        handleError(addMessage, parseMessageErr)(e)
      }
    } else if (
      packet.id === 0x30 /* Player Chat Message (clientbound) */ &&
      is119
    ) {
      // TODO-1.19: Support player chat messages.
    } else if (
      packet.id === 0x5f /* System Chat Message (clientbound) */ &&
      is119
    ) {
      try {
        const [chatLength, chatVarIntLength] = readVarInt(packet.data)
        const chatJson = packet.data
          .slice(chatVarIntLength, chatVarIntLength + chatLength)
          .toString('utf8')
        const position = packet.data.readInt8(chatVarIntLength + chatLength)
        // TODO-1.19 - 3: say command, 4: msg command, 5: team msg command, 6: emote command, 7: tellraw command
        if (position === 0 || position === 1) {
          addMessage(parseValidJson(chatJson))
        }
      } catch (e) {
        handleError(addMessage, parseMessageErr)(e)
      }
    } else if (packet.id === 0x2e /* Open Window */) {
      // Just close the window.
      const [windowId] = readVarInt(packet.data)
      const buf = Buffer.alloc(1)
      buf.writeUInt8(windowId)
      connection // Close Window (serverbound)
        .writePacket(0x09, buf)
        .catch(handleError(addMessage, inventoryCloseErr))
    } else if (packet.id === 0x35 /* Death Combat Event */) {
      const [, playerIdLen] = readVarInt(packet.data)
      const offset = playerIdLen + 4 // Entity ID
      const [chatLen, chatVarIntLength] = readVarInt(packet.data, offset)
      const jsonOffset = offset + chatVarIntLength
      const deathMessage = parseValidJson(
        packet.data.slice(jsonOffset, jsonOffset + chatLen).toString('utf8')
      )
      addMessage(deathRespawnMessage)
      if (deathMessage?.text || deathMessage?.extra) addMessage(deathMessage)
      // Automatically respawn.
      // LOW-TODO: Should this be manual, or a dialog, like MC?
      connection // Client Status
        .writePacket(0x04, writeVarInt(0))
        .catch(handleError(addMessage, respawnErr))
    } else if (packet.id === 0x52 /* Update Health */) {
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
