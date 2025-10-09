import * as React from "react"

export default function Section({ className = "", ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={`py-10 sm:py-12 lg:py-16 ${className}`} {...props} />
}
