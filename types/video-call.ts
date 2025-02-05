export interface VideoCallProps {
    roomId: string
    userId: string
  }
  
  export interface Signal {
    type: "offer" | "answer" | "ice-candidate"
    sender: string
    payload: any
  }
  
  