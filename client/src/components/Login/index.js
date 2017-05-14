import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { Form, Loader, Dimmer } from 'semantic-ui-react'
import validator from 'validator'

import actions from '../../actions/AuthActionCreators'

class Login extends Component {
  constructor (props) {
    super(props)
    this.state = {
      email: '',
      password: '',
    }

    this._updateEmail = this._updateEmail.bind(this)
    this._updatePassword = this._updatePassword.bind(this)
  }

  componentWillReceiveProps () {
    /* if (this.props.loginState === 'loading' && nextProps.loginState === 'done') {
      // signup successful!
      this.setState({
        renderSignup: false,
      })
    } */
  }

  _updateEmail (e, { value }) {
    this.setState({ email: value })
  }

  _updatePassword (e, { value }) {
    this.setState({ password: value })
  }

  _handleLogin (e) {
    e.preventDefault()
    this.props.dispatch(actions.login(this.state))
  }

  _isFormValid () {
    const { email, password } = this.state
    const { isEmail, isEmpty } = validator

    return !isEmpty(email) && !isEmpty(password) && isEmail(email)
  }

  _renderLoading () {
    return this.props.loginState === 'loading' ? (
      <Dimmer active inverted>
        <Loader size="large" active inverted>Hold tight! Loading wiki content...</Loader>
      </Dimmer>
    ) : null
  }

  render () {
    const { email, password } = this.state
    return (
      <div className="s-signup-form u-center">
        <h2>VideoWiki is made by people like you</h2>
        <Form className="c-signup-form u-block-center">
          <Form.Input
            placeholder="Email"
            type="email"
            icon="envelope"
            iconPosition="right"
            onChange={this._updateEmail}
            value={email}
          />
          <Form.Input
            placeholder="Password"
            type="password"
            icon="lock"
            iconPosition="right"
            onChange={this._updatePassword}
            value={password}
          />
          <Form.Button
            primary
            disabled={!this._isFormValid()}
            onClick={(e) => this._handleLogin(e)}
          >
            Login
          </Form.Button>
        </Form>
      </div>
    )
  }
}

const mapStateToProps = (state) =>
  Object.assign({}, state.auth)
export default connect(mapStateToProps)(Login)

Login.propTypes = {
  dispatch: PropTypes.func.isRequired,
  loginState: PropTypes.string,
}