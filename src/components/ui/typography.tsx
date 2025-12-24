import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface TypographyProps {
  children: ReactNode
  className?: string
}

// Headings
export function H1({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function H2({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function H3({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

export function H4({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
}

// Paragraph
export function P({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
      {...props}
    >
      {children}
    </p>
  )
}

// Blockquote
export function Blockquote({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      className={cn("mt-6 border-l-2 pl-6 italic", className)}
      {...props}
    >
      {children}
    </blockquote>
  )
}

// Table
export function Table({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="my-6 w-full overflow-y-auto">
      <table className={cn("w-full", className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("[&_tr]:border-b", className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("m-0 border-t p-0 even:bg-muted", className)} {...props}>
      {children}
    </tr>
  )
}

export function TableHead({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}

// Lists
export function Ul({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)} {...props}>
      {children}
    </ul>
  )
}

export function Ol({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLOListElement>) {
  return (
    <ol className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)} {...props}>
      {children}
    </ol>
  )
}

export function Li({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn("mt-2", className)} {...props}>
      {children}
    </li>
  )
}

// Inline code
export function Code({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </code>
  )
}

// Lead text
export function Lead({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xl text-muted-foreground", className)} {...props}>
      {children}
    </p>
  )
}

// Large text
export function Large({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-lg font-semibold", className)} {...props}>
      {children}
    </div>
  )
}

// Small text
export function Small({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLSmallElement>) {
  return (
    <small className={cn("text-sm font-medium leading-none", className)} {...props}>
      {children}
    </small>
  )
}

// Muted text
export function Muted({ children, className, ...props }: TypographyProps & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  )
}
