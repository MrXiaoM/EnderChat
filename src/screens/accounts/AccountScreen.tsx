import React, { useContext, useState } from 'react'
import { StyleSheet, View, Image, Pressable } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import AddAccountDialog from './AddAccountDialog'
import globalStyle from '../../globalStyle'
import Text from '../../components/Text'
import Dialog, { dialogStyles } from '../../components/Dialog'
import useDarkMode from '../../context/useDarkMode'
import UsersContext from '../../context/accountsContext'
import ElevatedView from '../../components/ElevatedView'
import { invalidate } from '../../minecraft/yggdrasil'

// TODO: Enable reloading to update account info for online mode using /refresh.
const AccountScreen = () => {
  const darkMode = useDarkMode()
  const { accounts, setAccounts } = useContext(UsersContext)

  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false)
  const [deleteAccount, setDeleteAccount] = useState('')

  const setActiveAccount = (uuid: string) => {
    const newAccounts = accounts
    for (const key in newAccounts) {
      if (newAccounts[key].active) {
        newAccounts[key].active = false
      }
    }
    newAccounts[uuid].active = true
    setAccounts(newAccounts)
  }

  return (
    <>
      <AddAccountDialog
        open={addAccountDialogOpen}
        setOpen={setAddAccountDialogOpen}
      />
      <Dialog
        visible={!!deleteAccount}
        onRequestClose={() => setDeleteAccount('')}
        containerStyles={styles.deleteAccountDialog}
      >
        <Pressable
          onPress={async () => {
            const { accessToken, clientToken } = accounts[deleteAccount]
            if (accessToken && clientToken) {
              try {
                await invalidate(accessToken, clientToken)
              } catch (e) {
                return // TODO: Do something more intelligent? Should alert the user.
              }
            }
            delete accounts[deleteAccount]
            setDeleteAccount('')
            setAccounts(accounts)
          }}
          android_ripple={{ color: '#aaa' }}
          style={styles.modalButton}
        >
          <Text style={styles.deleteAccountText}>
            Delete '{deleteAccount && accounts[deleteAccount].username}' account
          </Text>
        </Pressable>
      </Dialog>
      <View style={darkMode ? globalStyle.darkHeader : globalStyle.header}>
        <Text style={globalStyle.title}>Accounts</Text>
        <View style={globalStyle.flexSpacer} />
        <Ionicons.Button
          name='add'
          onPress={() => setAddAccountDialogOpen(true)}
          iconStyle={globalStyle.iconStyle}
        >
          Add
        </Ionicons.Button>
      </View>
      <View style={globalStyle.outerView}>
        {Object.keys(accounts)
          .sort((a, b) =>
            accounts[a].active
              ? -1
              : accounts[b].active
              ? 1
              : a.localeCompare(b)
          )
          .map(uuid => (
            <ElevatedView key={uuid} style={styles.accountView}>
              <Pressable
                onPress={() => setActiveAccount(uuid)}
                onLongPress={() => setDeleteAccount(uuid)}
                android_ripple={{ color: '#aaa' }}
                style={styles.accountPressable}
              >
                <Image
                  source={{
                    uri: `https://crafthead.net/avatar/${
                      accounts[uuid].accessToken
                        ? uuid
                        : accounts[uuid].username
                    }/72`
                  }}
                  style={styles.accountImage}
                />
                <View>
                  <Text style={styles.username}>{accounts[uuid].username}</Text>
                  {accounts[uuid].active && (
                    <Text style={styles.active}>Active Account</Text>
                  )}
                  <Text style={darkMode ? styles.authTxtDark : styles.authTxt}>
                    {accounts[uuid].accessToken
                      ? 'Mojang: ' + accounts[uuid].email
                      : 'No Authentication'}
                  </Text>
                </View>
              </Pressable>
            </ElevatedView>
          ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  accountView: { marginBottom: 12 },
  accountPressable: { padding: 8, flexDirection: 'row' },
  accountImage: {
    padding: 4,
    height: 72,
    width: 72,
    resizeMode: 'contain',
    marginRight: 16
  },
  active: { fontSize: 16 },
  username: { fontSize: 20, fontWeight: 'bold' },
  authTxt: { fontSize: 12, color: '#666', fontWeight: '300' },
  authTxtDark: { fontSize: 12, color: '#aaa', fontWeight: '300' },
  deleteAccountText: { fontSize: 16 },
  deleteAccountDialog: { padding: 0 },
  ...dialogStyles
})

export default AccountScreen