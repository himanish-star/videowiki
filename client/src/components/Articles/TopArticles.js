import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { Grid } from 'semantic-ui-react'

import ArticleCard from './ArticleCard'

import StateRenderer from '../common/StateRenderer'

import actions from '../../actions/ArticleActionCreators'

import { categories } from './HardCodedArticles'

class TopArticles extends Component {
  componentWillMount () {
    this.props.dispatch(actions.fetchTopArticles())
  }

  _renderArticles (titles) {
    const { topArticles, language } = this.props;

    return topArticles.sort((a, b) => titles.indexOf(a.title) > titles.indexOf(b.title))
      .map((article) => {
        const { image, title, _id, wikiSource, ns } = article
        const url = `/${language}/videowiki/${title}?wikiSource=${wikiSource}`
        if (!titles.some((title) => title === article.title)) {
          return false;
        }
        return (
          <Grid.Column computer={3} tablet={5} mobile={16} key={ _id }>
            <ArticleCard
              url={ url }
              image={ image }
              title={ title }
              ns={ ns || 0 }
            />
          </Grid.Column>
        )
      })
  }

  _render () {
    return (
      <div className="c-app-card-layout home">
        <Grid>
          {categories.map((item, index) =>
            <Grid.Row key={index}>
              <h2 className="section-title">{item.category}</h2>{this._renderArticles(item.title)}
            </Grid.Row>,
          )}
        </Grid>
      </div>
    )
  }

  render () {
    const { topArticlesState } = this.props
    return (
      <StateRenderer
        loaderDisabled={true}
        componentState={topArticlesState}
        loaderImage="/img/view-loader.gif"
        loaderMessage="Loading your article from the sum of all human knowledge!"
        errorMessage="Error while loading articles! Please try again later!"
        onRender={() => this._render()}
      />
    )
  }
}

TopArticles.propTypes = {
  dispatch: PropTypes.func.isRequired,
  topArticlesState: PropTypes.string.isRequired,
  topArticles: PropTypes.array.isRequired,
  language: PropTypes.string.isRequired,
}

const mapStateToProps = (state) =>
  Object.assign({}, { ...state.article, language: state.ui.language })

export default connect(mapStateToProps)(TopArticles)
