/**
 * Custom component to show order items with dealer links
 */

import React from 'react'
import { Box, Text, Table, TableHead, TableRow, TableCell, TableBody, Badge } from '@adminjs/design-system'

const OrderItemsShow = ({ record }) => {
  const items = record.params.items || []

  if (!Array.isArray(items) || items.length === 0) {
    return <Text>Нет товаров в заказе</Text>
  }

  const dealerColors = {
    digikey: '#CC0000',
    mouser: '#004A85',
    farnell: '#FF6600',
    tme: '#003366'
  }

  return (
    <Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>MPN</TableCell>
            <TableCell>Производитель</TableCell>
            <TableCell>Количество</TableCell>
            <TableCell>Цена (шт.)</TableCell>
            <TableCell>Сумма</TableCell>
            <TableCell>Ссылки на диллеров</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                <Text fontWeight="bold">{item.mpn}</Text>
              </TableCell>
              <TableCell>{item.manufacturer}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.price} ₽</TableCell>
              <TableCell>
                <Text fontWeight="bold">{(item.price * item.quantity).toFixed(2)} ₽</Text>
              </TableCell>
              <TableCell>
                {item.dealer_links && Object.keys(item.dealer_links).length > 0 ? (
                  <Box display="flex" flexWrap="wrap" style={{ gap: '8px' }}>
                    {Object.entries(item.dealer_links).map(([dealer, url]) => (
                      <a
                        key={dealer}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 12px',
                          background: dealerColors[dealer] || '#666',
                          color: 'white',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}
                      >
                        {dealer}
                      </a>
                    ))}
                  </Box>
                ) : (
                  <Badge variant="default">Нет ссылок</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

export default OrderItemsShow
