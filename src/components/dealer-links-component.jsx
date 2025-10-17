import React from 'react'
import { Box, Text, Link, Badge } from '@adminjs/design-system'

/**
 * Custom component to display dealer links as clickable elements
 */
const DealerLinksComponent = (props) => {
  const { record } = props

  if (!record || !record.params || !record.params.dealer_links) {
    return <Text>No dealer links available</Text>
  }

  let dealerLinks = []

  try {
    // Parse dealer links if it's a string
    if (typeof record.params.dealer_links === 'string') {
      dealerLinks = JSON.parse(record.params.dealer_links)
    } else {
      dealerLinks = record.params.dealer_links
    }

    // If not an array, convert to array
    if (!Array.isArray(dealerLinks)) {
      dealerLinks = [dealerLinks]
    }
  } catch (error) {
    return <Text>Error parsing dealer links: {error.message}</Text>
  }

  if (dealerLinks.length === 0) {
    return <Text>No dealer links available</Text>
  }

  // Helper function to get badge color by dealer name
  const getDealerColor = (dealer) => {
    const lowerDealer = (dealer || '').toLowerCase()
    if (lowerDealer.includes('mouser')) return 'blue'
    if (lowerDealer.includes('digikey')) return 'green'
    if (lowerDealer.includes('farnell')) return 'red'
    if (lowerDealer.includes('tme')) return 'orange'
    return 'grey'
  }

  return (
    <Box>
      {dealerLinks.map((link, index) => {
        // Handle different formats of dealer links
        const dealer = link.dealer || link.name || 'Unknown'
        const url = link.url || link.link || '#'

        return (
          <Box key={index} mb={1} p={1} style={{ borderBottom: '1px solid #eee' }}>
            <Badge bg={getDealerColor(dealer)} mb={1}>{dealer}</Badge>
            <Box>
              <Link href={url} target="_blank" rel="noopener noreferrer">
                {url.length > 60 ? `${url.substring(0, 60)}...` : url}
              </Link>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export default DealerLinksComponent
