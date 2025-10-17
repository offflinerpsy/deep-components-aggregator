import { sendMail, sendTemplatedMail } from './mailer.mjs'

const queue = []
let isProcessing = false
const MAX_RETRIES = 3
const RETRY_DELAY = 5000
const PROCESS_DELAY = 1000

async function processQueue() {
  if (isProcessing || queue.length === 0) return
  
  isProcessing = true
  
  while (queue.length > 0) {
    const task = queue[0]
    
    try {
      let result
      if (task.template) {
        // Template-based email
        result = await sendTemplatedMail(task.template)
      } else {
        // Direct mail object
        result = await sendMail(task.mail)
      }
      
      if (result.ok) {
        queue.shift() // Remove successful task
        if (task.resolve) task.resolve(result)
      } else {
        if (task.retries < MAX_RETRIES) {
          task.retries++
          // Move to end of queue
          queue.push(queue.shift())
          await new Promise(r => setTimeout(r, RETRY_DELAY))
        } else {
          queue.shift()
          if (task.reject) task.reject(new Error(result.error))
        }
      }
    } catch (error) {
      if (task.retries < MAX_RETRIES) {
        task.retries++
        queue.push(queue.shift())
        await new Promise(r => setTimeout(r, RETRY_DELAY))
      } else {
        queue.shift()
        if (task.reject) task.reject(error)
      }
    }
    
    // Small delay between processing
    await new Promise(r => setTimeout(r, PROCESS_DELAY))
  }
  
  isProcessing = false
}

export function queueMail(mail) {
  return new Promise((resolve, reject) => {
    queue.push({ mail, retries: 0, resolve, reject })
    processQueue()
  })
}

export function queueTemplatedMail(options) {
  return new Promise((resolve, reject) => {
    const task = {
      mail: null,
      template: options,
      retries: 0,
      resolve,
      reject
    }
    queue.push(task)
    processQueue()
  })
}

export function getQueueStats() {
  return {
    length: queue.length,
    isProcessing
  }
}