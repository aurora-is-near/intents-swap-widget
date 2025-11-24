import React from "react"

const TransitionRoot = ({
  children,
  className,
  show = true,
}: {
  children: React.ReactNode
  className?: string
  show?: boolean
}) => (show ? <div className={className}>{children}</div> : null)

const ReturnChildren = ({
  children,
  className,
}: {
  children: React.ReactNode | ((data: object) => React.ReactNode)
  className?: string | ((data: object) => string)
}) => (
  <div className={typeof className === "function" ? className({}) : className}>
    {typeof children === "function" ? children({}) : children}
  </div>
)

export const headlessUITransitionMock = (
  originalModule: Record<string, any>,
) => ({
  ...originalModule,
  Dialog: TransitionRoot,
  DialogPanel: ReturnChildren,
  DialogTitle: ReturnChildren,
  Listbox: TransitionRoot,
  ListboxOptions: TransitionRoot,
  ListboxButton: ReturnChildren,
  ListboxOption: ReturnChildren,
  Transition: TransitionRoot,
  TransitionChild: ReturnChildren,
})
