import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import {
  Route,
  Switch,
} from 'react-router-dom'

import Home from '../Home'
import VerifySignup from '../Signup/VerifySignup'
import Signup from '../Signup'
import Login from '../Login'
import Page from '../Page'
import Editor from '../Editor'
import Header from '../Header'
// import Footer from '../Footer'
import WikiProgress from '../Wiki/WikiProgress'
import SiteNotFound from '../SiteNotFound'

import actions from '../../actions/AuthActionCreators'

class Site extends Component {
  componentWillMount () {
    this.props.dispatch(actions.validateSession())
  }

  render () {
    const { match, session } = this.props

    return (
      <div className="c-app">
        <Header match={ match } session={ session }/>
        <div className="c-app__main">
          <Switch>
            <Route exact path="/" component={Home}/>
            <Route path="/signup/verify" component={VerifySignup}/>
            <Route path="/signup" component={Signup}/>
            <Route path="/login" component={Login}/>
            <Route path="/wiki/convert/:title" component={WikiProgress}/>
            <Route path="/wiki/:title" component={Page}/>
            <Route path="/editor/:title" component={Editor}/>
            <Route component={SiteNotFound}/>
          </Switch>
        </div>
        {/* <Footer /> */}
      </div>
    )
  }
}

const mapStateToProps = (state) =>
  Object.assign({}, state.auth)
export default connect(mapStateToProps)(Site)

Site.propTypes = {
  dispatch: PropTypes.func.isRequired,
  match: PropTypes.object,
  session: PropTypes.object,
}
