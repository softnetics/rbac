import { describe, expect, test } from 'vitest'

import { createIdentity, createPolicy } from '.'

describe('create role', () => {
  describe('single policy', () => {
    const p1 = createPolicy({
      name: 'todo',
      permissions: {
        todo: ['create', 'read', 'update', 'delete'],
        comment: ['create', 'read', 'delete'],
      },
      roles: {
        viewer: ['todo.read', 'comment.read'],
        editor: ['todo.*', 'comment.delete'],
        admin: '*',
      },
    })

    const id = createIdentity({
      policies: [p1],
      identities: {
        viewer: ['todo.viewer'],
        editor: ['todo.editor'],
        admin: ['todo.admin'],
      },
    })

    describe('viewer', () => {
      test('viewer can read todo', () => {
        expect(id.enforce('viewer', ['todo.todo.read'])).toBe(true)
      })

      test('viewer can read comment', () => {
        expect(id.enforce('viewer', ['todo.comment.read'])).toBe(true)
      })

      test('viewer cannot create todo', () => {
        expect(id.enforce('viewer', ['todo.todo.create'])).toBe(false)
      })

      test('viewer cannot create comment', () => {
        expect(id.enforce('viewer', ['todo.comment.create'])).toBe(false)
      })
    })

    describe('editor', () => {
      test('editor has all todo permissions', () => {
        expect(
          id.enforce('editor', [
            'todo.todo.create',
            'todo.comment.delete',
            'todo.todo.read',
            'todo.todo.update',
          ])
        ).toBe(true)
      })

      test('editor cannot create comment', () => {
        expect(id.enforce('editor', ['todo.comment.create'])).toBe(false)
      })
    })

    describe('admin', () => {
      test('admin has all permissions', () => {
        expect(
          id.enforce('admin', [
            'todo.todo.create',
            'todo.todo.read',
            'todo.todo.update',
            'todo.todo.delete',
            'todo.comment.create',
            'todo.comment.read',
            'todo.comment.delete',
          ])
        ).toBe(true)
      })
    })

    describe('invalid identity', () => {
      test('invalid identity cannot read todo', () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(id.enforce('invalid-identity', ['todo.todo.read'])).toBe(false)
      })
    })
  })
})
