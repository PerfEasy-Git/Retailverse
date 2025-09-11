import React, { createContext, useContext, useState } from 'react'
import MessageDisplay from '../components/MessageDisplay'

const MessageContext = createContext()

export const useMessage = () => {
  const context = useContext(MessageContext)
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider')
  }
  return context
}

export const MessageProvider = ({ children }) => {
  console.log('💬 MessageProvider rendering...', new Date().toISOString())
  
  const [messages, setMessages] = useState([])

  const addMessage = (message, type = 'info', persistent = true) => {
    console.log('💬 Adding message:', message, type, new Date().toISOString())
    const id = Date.now() + Math.random()
    setMessages(prev => [...prev, { id, message, type, persistent }])
    return id
  }

  const removeMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }

  const clearMessages = () => {
    setMessages([])
  }

  const showSuccess = (message, persistent = true) => {
    return addMessage(message, 'success', persistent)
  }

  const showError = (message, persistent = true) => {
    return addMessage(message, 'error', persistent)
  }

  const showWarning = (message, persistent = true) => {
    return addMessage(message, 'warning', persistent)
  }

  const showInfo = (message, persistent = true) => {
    return addMessage(message, 'info', persistent)
  }

  const value = {
    messages,
    addMessage,
    removeMessage,
    clearMessages,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }

  return (
    <MessageContext.Provider value={value}>
      {children}
      {/* Global message display */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {messages.map((msg) => (
          <MessageDisplay
            key={msg.id}
            message={msg.message}
            type={msg.type}
            onClose={() => removeMessage(msg.id)}
            persistent={msg.persistent}
          />
        ))}
      </div>
    </MessageContext.Provider>
  )
}
