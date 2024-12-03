import { createPolicy } from '@softnetics/rbac'

const policy = createPolicy({
  name: 'todo',
  permissions: {
    todo: ['create', 'read', 'update', 'delete'],
    comment: ['create', 'read', 'update'],
  },
  roles: {
    viewer: ['todo.read', 'comment.read'],
    editor: ['todo.create', 'todo.update', 'comment.create', 'comment.update'],
  },
})
