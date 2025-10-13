/**
 * Custom Dashboard Component for AdminJS
 */

import React, { useEffect, useState } from 'react'
import { Box, H3, Text, Table, TableHead, TableRow, TableCell, TableBody, Badge } from '@adminjs/design-system'
import { ApiClient } from 'adminjs'

const api = new ApiClient()

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [apiHealth, setApiHealth] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch today's stats
        const statsRes = await api.resourceAction({
          resourceId: 'ProjectStat',
          actionName: 'list'
        })
        
        // Fetch API health
        const healthRes = await api.resourceAction({
          resourceId: 'ApiHealth',
          actionName: 'list'
        })

        setStats(statsRes.data.records[0]?.params || {})
        setApiHealth(healthRes.data.records.map(r => r.params))
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setLoading(false)
      }
    }

    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <Box p="xxl"><Text>Загрузка...</Text></Box>
  }

  const getStatusBadge = (status) => {
    const variants = {
      online: 'success',
      offline: 'danger',
      degraded: 'warning'
    }
    const labels = {
      online: '🟢 Online',
      offline: '🔴 Offline',
      degraded: '🟡 Degraded'
    }
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>
  }

  return (
    <Box p="xxl">
      <H3 mb="xl">📊 Панель управления Deep Components Aggregator</H3>

      {/* Stats Cards */}
      <Box display="flex" flexWrap="wrap" mb="xl" style={{ gap: '20px' }}>
        <Box
          flex="1"
          minWidth="200px"
          p="lg"
          bg="white"
          border="default"
          borderRadius="default"
        >
          <Text fontSize="sm" color="grey60" mb="sm">Поисковых запросов сегодня</Text>
          <Text fontSize="xxl" fontWeight="bold">{stats.total_searches || 0}</Text>
        </Box>

        <Box
          flex="1"
          minWidth="200px"
          p="lg"
          bg="white"
          border="default"
          borderRadius="default"
        >
          <Text fontSize="sm" color="grey60" mb="sm">Попаданий в кэш</Text>
          <Text fontSize="xxl" fontWeight="bold">{stats.cache_hits || 0}</Text>
          <Text fontSize="sm" color="grey60">
            {stats.total_searches > 0
              ? `${Math.round((stats.cache_hits / stats.total_searches) * 100)}% эффективность`
              : '0% эффективность'}
          </Text>
        </Box>

        <Box
          flex="1"
          minWidth="200px"
          p="lg"
          bg="white"
          border="default"
          borderRadius="default"
        >
          <Text fontSize="sm" color="grey60" mb="sm">Live поиск (API)</Text>
          <Text fontSize="xxl" fontWeight="bold">{stats.live_searches || 0}</Text>
        </Box>

        <Box
          flex="1"
          minWidth="200px"
          p="lg"
          bg="white"
          border="default"
          borderRadius="default"
        >
          <Text fontSize="sm" color="grey60" mb="sm">Заказов сегодня</Text>
          <Text fontSize="xxl" fontWeight="bold">{stats.total_orders || 0}</Text>
        </Box>

        <Box
          flex="1"
          minWidth="200px"
          p="lg"
          bg="white"
          border="default"
          borderRadius="default"
        >
          <Text fontSize="sm" color="grey60" mb="sm">Среднее время ответа</Text>
          <Text fontSize="xxl" fontWeight="bold">
            {stats.avg_response_time_ms ? `${stats.avg_response_time_ms}ms` : 'N/A'}
          </Text>
        </Box>
      </Box>

      {/* API Health Table */}
      <Box bg="white" border="default" borderRadius="default" p="lg">
        <H3 mb="lg">🔌 Статус API сервисов</H3>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Сервис</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Последняя проверка</TableCell>
              <TableCell>Время ответа</TableCell>
              <TableCell>Success Rate (24h)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiHealth.map((service) => (
              <TableRow key={service.service}>
                <TableCell>
                  <Text fontWeight="bold" textTransform="uppercase">
                    {service.service}
                  </Text>
                </TableCell>
                <TableCell>{getStatusBadge(service.status)}</TableCell>
                <TableCell>
                  {service.last_check
                    ? new Date(service.last_check).toLocaleString('ru-RU')
                    : 'Никогда'}
                </TableCell>
                <TableCell>
                  {service.response_time_ms ? `${service.response_time_ms}ms` : 'N/A'}
                </TableCell>
                <TableCell>
                  {service.success_rate_24h ? `${service.success_rate_24h}%` : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Quick Links */}
      <Box mt="xl" display="flex" style={{ gap: '15px' }}>
        <a
          href="/admin/resources/Order"
          style={{
            padding: '12px 24px',
            background: '#1976d2',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          📦 Заказы
        </a>
        <a
          href="/admin/resources/ManualProduct"
          style={{
            padding: '12px 24px',
            background: '#2e7d32',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          ➕ Добавить товар
        </a>
        <a
          href="/admin/resources/StaticPage"
          style={{
            padding: '12px 24px',
            background: '#ed6c02',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          📝 Редактировать страницы
        </a>
      </Box>
    </Box>
  )
}

export default Dashboard
