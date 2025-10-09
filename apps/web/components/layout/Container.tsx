import * as React from "react"

export default function Container({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`container-std ${className}`} {...props} />
}
