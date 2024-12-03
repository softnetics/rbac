import { createIdentity } from '@softnetics/rbac'

const identity = createIdentity({
  policies: [policy],
  identities: {
    student: ['todo.viewer'],
    teacher: ['todo.editor', 'todo.viewer'],
  },
})
