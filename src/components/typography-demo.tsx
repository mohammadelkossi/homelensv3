import {
  H1,
  H2,
  H3,
  H4,
  P,
  Blockquote,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Ul,
  Ol,
  Li,
  Code,
  Lead,
  Large,
  Small,
  Muted,
} from "@/components/ui/typography"

export function TypographyDemo() {
  return (
    <div className="space-y-6 p-6">
      <H1>Typography Demo</H1>
      
      <H2>Headings</H2>
      <H1>Heading 1</H1>
      <H2>Heading 2</H2>
      <H3>Heading 3</H3>
      <H4>Heading 4</H4>
      
      <H2>Paragraph</H2>
      <P>
        This is a regular paragraph. It demonstrates the default paragraph styling
        with proper line height and spacing.
      </P>
      
      <H2>Blockquote</H2>
      <Blockquote>
        "This is a blockquote. It's used to highlight important quotes or
        callouts in your content."
      </Blockquote>
      
      <H2>Table</H2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Smith</TableCell>
            <TableCell>Inactive</TableCell>
            <TableCell>jane@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      
      <H2>Lists</H2>
      <Ul>
        <Li>First item</Li>
        <Li>Second item</Li>
        <Li>Third item</Li>
      </Ul>
      
      <Ol>
        <Li>First ordered item</Li>
        <Li>Second ordered item</Li>
        <Li>Third ordered item</Li>
      </Ol>
      
      <H2>Inline Code</H2>
      <P>
        Use <Code>console.log()</Code> to debug your JavaScript code.
      </P>
      
      <H2>Text Variants</H2>
      <Lead>This is a lead paragraph that stands out from regular text.</Lead>
      <Large>This is large text for emphasis.</Large>
      <Small>This is small text for fine print.</Small>
      <Muted>This is muted text for secondary information.</Muted>
    </div>
  )
}

