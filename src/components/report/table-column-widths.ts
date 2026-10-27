// Shared fixed column widths for §02's two sales tables ("5 most recent sales
// nearby" and "5 closest for sale now") — both share the same Address / 2nd
// col / £ per m² / Price / Distance layout, and since they're two separate
// <table> elements stacked vertically, each would otherwise auto-size its
// columns independently based on its own content (e.g. a longer address)
// and drift out of visual alignment with the other. Fixed widths here keep
// both tables' columns lined up regardless of content length.
export const TABLE_COL_WIDTHS = {
  second: 130, // "Sold" date / "Beds / baths" — the wider of the two sets the width
  pricePerSqm: 90,
  price: 100,
  distance: 70,
}
