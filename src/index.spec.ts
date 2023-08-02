import { expect, test } from 'vitest'

import { createIdentity, createPolicy } from '.'

test('create role', () => {
  const p1 = createPolicy({
    name: 'live-course',
    permissions: {
      'live-course': ['create', 'read', 'update', 'delete'],
      'live-session': ['create', 'read', 'update'],
    },
    roles: {
      student: ['live-session.read'],
      teacher: ['live-course.update'],
    },
  })

  const p2 = createPolicy({
    name: 'live-session',
    permissions: {
      'live-course': ['create', 'read', 'update', 'delete'],
      'live-session': ['create', 'read', 'update'],
    },
    roles: {
      student: ['live-course.delete', 'live-session.read'],
      admin: ['live-course.update'],
    },
  })

  const id = createIdentity({
    policies: [p1, p2],
    identities: {
      freemium: ['live-course.student'],
      premium: ['live-course.teacher', 'live-session.student'],
      admin: ['live-session.admin', 'live-session.student'],
      enrolled: ['live-course.student', 'live-session.student'],
    },
  })

  expect(
    id.enforce('admin', ['live-session.live-course.update', 'live-session.live-session.read'])
  ).toBe(true)

  expect(id.enforce('freemium', ['live-course.live-session.update'])).toBe(false)
})
