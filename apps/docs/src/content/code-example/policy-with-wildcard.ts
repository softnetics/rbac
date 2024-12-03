createPolicy({
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
