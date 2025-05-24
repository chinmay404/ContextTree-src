import type React from "react"
import { SaveStatus } from "./save-status"

const ConversationCanvas: React.FC = () => {
  return (
    <div>
      <h1>Conversation Canvas</h1>
      <SaveStatus />
    </div>
  )
}

export default ConversationCanvas
