import { defineEventHandler, readBody, createError } from 'h3'

interface FeedbackRequestBody {
  title: string
  description: string
  feedbackType: 'bug' | 'feature' | 'entry-error'
  entryWord?: string
  entrySource?: string
  entryId?: string
  contact?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = config.githubToken
  const repo = config.githubRepo

  if (!token || !repo) {
    throw createError({
      statusCode: 500,
      message: 'GitHub configuration is missing'
    })
  }

  const body = await readBody<FeedbackRequestBody>(event)
  if (!body?.title || !body.description || !body.feedbackType) {
    throw createError({
      statusCode: 400,
      message: 'Invalid payload'
    })
  }

  const labelMap: Record<FeedbackRequestBody['feedbackType'], string> = {
    bug: 'bug',
    feature: 'enhancement',
    'entry-error': 'entry-error'
  }

  const issueLabels = [labelMap[body.feedbackType]]

  const issueBody = buildIssueBody(body)

  const apiUrl = `https://api.github.com/repos/${repo}/issues`

  const res = await $fetch<{ html_url: string; number: number }>(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'jyutjyu-feedback'
    },
    body: {
      title: body.title,
      body: issueBody,
      labels: issueLabels
    }
  })

  return {
    url: res.html_url,
    number: res.number
  }
})

const buildIssueBody = (payload: FeedbackRequestBody) => {
  const typeLabels: Record<FeedbackRequestBody['feedbackType'], string> = {
    bug: 'Bug Report',
    feature: 'Feature Request',
    'entry-error': 'Entry Correction'
  }

  let body = `## ${typeLabels[payload.feedbackType]}

**Description:**
${payload.description}
`

  if (payload.feedbackType === 'entry-error') {
    body += `
**Entry Details:**
- Headword: ${payload.entryWord || 'N/A'}
- Source Book: ${payload.entrySource || 'N/A'}
- Entry ID: ${payload.entryId || 'N/A'}
`
  }

  if (payload.contact) {
    body += `
**Contact:**
${payload.contact}
`
  }

  body += `
---
*Submitted via Jyutjyu feedback form*`

  return body
}
