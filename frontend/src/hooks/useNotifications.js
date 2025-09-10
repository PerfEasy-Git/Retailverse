import { useContext } from 'react'
import { MessageContext } from '../contexts/MessageContext'

export const useNotifications = () => {
  const context = useContext(MessageContext)
  
  if (!context) {
    throw new Error('useNotifications must be used within a MessageProvider')
  }
  
  return context
}
