import React, { useState } from 'react'
import { StyleSheet, View, Switch, Pressable } from 'react-native'

import TextFieldDialog from './TextFieldDialog'
import globalStyle from '../globalStyle'
import Text from './Text'
import useDarkMode from '../context/useDarkMode'

const Setting = <T extends string | boolean>({
  name,
  value,
  setValue,
  multiline
}: {
  name: string
  value: T
  setValue?: (newValue: T) => void
  multiline?: boolean
}) => {
  const da = useDarkMode()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState(
    typeof value === 'string' ? value : ''
  )
  const Wrapper = setValue != null ? Pressable : React.Fragment
  const wrapperPress = () => {
    if (typeof value === 'boolean' && setValue != null) {
      setValue(!value as T)
    } else if (typeof value === 'string' && setValue != null && !modalOpen) {
      setModalOpen(true)
      setModalContent(value)
    }
  }

  return (
    <Wrapper
      {...(setValue != null
        ? { onPress: wrapperPress, android_ripple: { color: '#aaa' } }
        : {})}
    >
      {typeof value === 'string' && (
        <TextFieldDialog
          name={name}
          placeholder={name}
          multiline={multiline}
          modalOpen={modalOpen}
          initialState={modalContent}
          closeModal={() => setModalOpen(false)}
          setFinalState={response => {
            if (setValue != null) {
              setValue(response as T)
            }
          }}
        />
      )}
      <View
        style={
          typeof value === 'string' ? styles.setting : styles.settingWithSwitch
        }
      >
        <Text style={styles.settingText}>{name}</Text>
        {typeof value === 'string' && (
          <Text style={da ? styles.settingSubtextDark : styles.settingSubtext}>
            {value || 'N/A'}
          </Text>
        )}
        {typeof value === 'boolean' && (
          <>
            <View style={globalStyle.flexSpacer} />
            <Switch value={value} onValueChange={wrapperPress} />
          </>
        )}
      </View>
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  setting: { padding: 12, paddingLeft: 22, paddingRight: 22 },
  settingWithSwitch: {
    padding: 12,
    paddingLeft: 22,
    paddingRight: 22,
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingText: { fontSize: 18 },
  settingSubtext: { fontSize: 12, fontWeight: '100', color: '#666' },
  settingSubtextDark: { fontSize: 12, fontWeight: '100', color: '#aaa' }
})

export default Setting
