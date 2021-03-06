'use strict'

/*
 * adonis-edge
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const esprima = require('esprima')
const Lexer = require('../../src/Lexer')

test.group('Lexer', (group) => {
  group.beforeEach(() => {
    this.lexer = new Lexer()
  })

  test('identify an identifier', (assert) => {
    assert.isTrue(this.lexer.isStatement(esprima.parse(`'hello'`).body[0].expression.type))
  })

  test('identify a literal', (assert) => {
    assert.isTrue(this.lexer.isStatement(esprima.parse('hello').body[0].expression.type))
  })

  test('return false when not literal or identifier', (assert) => {
    assert.isFalse(this.lexer.isStatement(esprima.parse('a + b').body[0].expression.type))
  })

  test('identify an expression', (assert) => {
    assert.isTrue(this.lexer.isExpression(esprima.parse('a + b').body[0].expression.type))
  })

  test('return false when a literal', (assert) => {
    assert.isFalse(this.lexer.isExpression(esprima.parse(`'hello'`).body[0].expression.type))
  })

  test('return false when an identifier', (assert) => {
    assert.isFalse(this.lexer.isExpression(esprima.parse('hello').body[0].expression.type))
  })

  test('parse a literal', (assert) => {
    const statement = `'hello world'`
    const parsed = this.lexer.parseRaw(statement)
    assert.equal(parsed.originalType, 'Literal')
  })

  test('parse an identifier', (assert) => {
    const statement = `user`
    const parsed = this.lexer.parseRaw(statement)
    assert.equal(parsed.originalType, 'Identifier')
  })

  test('parse an expression', (assert) => {
    const statement = '2 + 2'
    const parsed = this.lexer.parseRaw(statement)
    assert.equal(parsed.originalType, 'BinaryExpression')
  })

  test('throw exception when not an expected expression', (assert) => {
    const statement = '2 + 2'
    const parsed = () => this.lexer.parseRaw(statement, ['SequenceExpression'])
    assert.throw(parsed, 'SequenceExpression is the only allowed expression, instead got BinaryExpression')
  })

  test('throw exception when not an expected statement', (assert) => {
    const statement = 'user'
    const parsed = () => this.lexer.parseRaw(statement, ['Literal'])
    assert.throw(parsed, 'Literal is the only allowed statement, instead got Identifier')
  })

  test('convert binary expression to statement', (assert) => {
    const statement = 'age > 12'
    const parsedStatement = this.lexer.parseRaw(statement)
    assert.equal(parsedStatement.toStatement(), `this.context.resolve('age') > 12`)
  })

  test('convert binary expression with native methods to statement', (assert) => {
    const statement = `username.length > 2`
    const parsedStatement = this.lexer.parseRaw(statement)
    assert.equal(parsedStatement.toStatement(), `this.context.accessChild(this.context.resolve('username'), ['length']) > 2`)
  })

  test('object access via square brackets to statement', (assert) => {
    const statement = `users['username'] === 'virk'`
    const parsedStatement = this.lexer.parseRaw(statement)
    assert.equal(parsedStatement.toStatement(), `this.context.accessChild(this.context.resolve('users'), ['username']) === 'virk'`)
  })

  test('object access via square brackets using variables to statement', (assert) => {
    const statement = `users[username] === 'virk'`
    const parsedStatement = this.lexer.parseRaw(statement)
    assert.equal(parsedStatement.toStatement(), `this.context.accessChild(this.context.resolve('users'), [this.context.resolve('username')]) === 'virk'`)
  })

  test('object access via square brackets on both sides to statement', (assert) => {
    const statement = `users[username] === deletedUsers[username]`
    const parsedStatement = this.lexer.parseRaw(statement)
    assert.equal(parsedStatement.toStatement(), `this.context.accessChild(this.context.resolve('users'), [this.context.resolve('username')]) === this.context.accessChild(this.context.resolve('deletedUsers'), [this.context.resolve('username')])`)
  })

  test('parse sequence expression to statement', (assert) => {
    const statement = `'message', { message }`
    const parsedObject = this.lexer.parseRaw(statement).toStatement()
    assert.deepEqual(parsedObject, [`'message'`, `{message: this.context.resolve('message')}`])
  })

  test('parse sequence expression with assignment to statement', (assert) => {
    const statement = `'message', from = user, isPrimary = true`
    const parsedObject = this.lexer.parseRaw(statement).toStatement()
    assert.deepEqual(parsedObject, [`'message'`, `{from: this.context.resolve('user')}`, `{isPrimary: true}`])
  })

  test('parse sequence expression with assignment and object literal', (assert) => {
    const statement = `'message', from = user, { message: message }`
    const parsedObject = this.lexer.parseRaw(statement).toStatement()
    assert.deepEqual(parsedObject, [`'message'`, `{from: this.context.resolve('user')}`, `{message: this.context.resolve('message')}`])
  })

  test('parse binary expression with custom operator', (assert) => {
    const statement = `user in users`
    const parsedStatement = this.lexer.parseRaw(statement)
    assert.equal(parsedStatement.toStatement(), `this.context.resolve('user') in this.context.resolve('users')`)
  })

  test('parse binary expression with custom operator and raw values on rhs', (assert) => {
    const statement = `user in [{username: activeUser.username}, {username: 'nikk'}]`
    const parsedStatement = this.lexer.parseRaw(statement)
    assert.equal(parsedStatement.toStatement(), `this.context.resolve('user') in [{username: this.context.accessChild(this.context.resolve('activeUser'), ['username'])},{username: 'nikk'}]`)
  })
})
