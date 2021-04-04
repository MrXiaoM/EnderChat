// Consider using Recoil instead of Context?
import React from 'react'

export interface Settings {
  joinMessage: string
  sendJoinMessage: boolean
  sendSpawnCommand: boolean
  chatTheme: 'Colorless'
  fontSize: number
  webLinks: boolean
  linkPrompt: boolean
  darkMode: boolean | null
}

export interface SettingsContext {
  settings: Settings
  setSettings: (newSettings: Partial<Settings>) => void
}

const settingsContext = React.createContext<SettingsContext>({
  settings: {
    joinMessage:
      'I connected using EnderChat, an ad-free, easy to use and well-built ' +
      'alternative to ChatCraft for Android! Even this message can be disabled!',
    sendJoinMessage: true,
    sendSpawnCommand: true,
    chatTheme: 'Colorless',
    fontSize: 16,
    webLinks: true,
    darkMode: false,
    linkPrompt: true
  },
  setSettings: () => {}
})

export default settingsContext
