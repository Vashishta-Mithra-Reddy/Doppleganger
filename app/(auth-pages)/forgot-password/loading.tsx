import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-dvh h-full w-full flex items-center justify-center  backdrop-blur-sm">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-black dark:text-white mx-auto" />
      </div>
    </div>
  )
}