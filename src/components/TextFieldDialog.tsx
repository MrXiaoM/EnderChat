import React, { useState } from 'react'
import { View, Pressable } from 'react-native'
import Dialog, { dialogStyles as styles } from './Dialog'
import Text from './Text'
import TextField from './TextField'
import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'

const TextFieldDialog = ({
  name,
  multiline,
  modalOpen,
  closeModal,
  placeholder,
  initialState,
  setFinalState
}: {
  name: string
  modalOpen: boolean
  multiline?: boolean
  placeholder: string
  closeModal: () => void
  initialState: string
  setFinalState: (state: string) => void
}) => {
  const [modalContent, setModalContent] = useState(initialState)
  const closeModalAndSaveState = () => {
    setFinalState(modalContent)
    closeModal()
  }
  const closeModalAndReset = () => {
    setModalContent(initialState)
    closeModal()
  }

  return (
    <Dialog visible={modalOpen} onRequestClose={closeModalAndSaveState}>
      <Text style={styles.modalTitle}>{name}</Text>
      <TextField
        value={modalContent}
        multiline={multiline}
        placeholder={placeholder}
        onChangeText={setModalContent}
      />
      <View style={styles.modalButtons}>
        <View style={globalStyle.flexSpacer} />
        <Pressable
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
          onPress={closeModalAndReset}
        >
          <Text
            style={
              useDarkMode()
                ? styles.modalButtonCancelDarkText
                : styles.modalButtonCancelText
            }
          >
            CANCEL
          </Text>
        </Pressable>
        <Pressable
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
          onPress={closeModalAndSaveState}
        >
          <Text style={styles.modalButtonText}>DONE</Text>
        </Pressable>
      </View>
    </Dialog>
  )
}

export default TextFieldDialog
