import React from 'react'
import { Box, Text, Link, Button } from '@adminjs/design-system'

/**
 * Custom component to display MPN as a link to product page
 */
const MpnLinkComponent = (props) => {
  const { record } = props

  if (!record || !record.params || !record.params.mpn) {
    return <Text>No MPN available</Text>
  }

  const mpn = record.params.mpn
  const manufacturer = record.params.manufacturer || ''

  // Create links to internal product page and search results
  const productUrl = `/product/${encodeURIComponent(mpn)}`
  const searchUrl = `/results?q=${encodeURIComponent(mpn)}`

  // Create links to external search engines
  const mouserUrl = `https://www.mouser.com/c/?q=${encodeURIComponent(mpn)}`
  const digikeyUrl = `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(mpn)}`
  const octopartUrl = `https://octopart.com/search?q=${encodeURIComponent(mpn)}`

  return (
    <Box>
      <Text fontWeight="bold">{mpn}</Text>
      {manufacturer && <Text color="grey">{manufacturer}</Text>}

      <Box mt={2}>
        <Text fontWeight="bold" mb={1}>Internal Links:</Text>
        <Box mb={1}>
          <Link href={productUrl} target="_blank" rel="noopener noreferrer">
            View Product Page
          </Link>
        </Box>
        <Box mb={2}>
          <Link href={searchUrl} target="_blank" rel="noopener noreferrer">
            Search Results
          </Link>
        </Box>

        <Text fontWeight="bold" mb={1}>External Search:</Text>
        <Box display="flex" flexDirection="row" flexWrap="wrap">
          <Button as="a" href={mouserUrl} target="_blank" rel="noopener noreferrer" mr={1} mb={1} size="sm">
            Mouser
          </Button>
          <Button as="a" href={digikeyUrl} target="_blank" rel="noopener noreferrer" mr={1} mb={1} size="sm">
            DigiKey
          </Button>
          <Button as="a" href={octopartUrl} target="_blank" rel="noopener noreferrer" mr={1} mb={1} size="sm">
            Octopart
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default MpnLinkComponent
