import * as React from "react"
import { cn } from "../../lib/utils"
// Note: We're using a simple label here to avoid unnecessary dependency on @radix-ui/react-label if only styling is needed, 
// but sticking to standard conventions often uses radix. Let's keep it simple and accessible.

const Label = React.forwardRef(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            className
        )}
        {...props}
    />
))
Label.displayName = "Label"

export { Label }
