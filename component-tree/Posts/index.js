import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import Relay from 'react-relay';
import styles from './Posts.css';

class PostsPage extends Component {
  render() {
    const { edges } = this.props.root.posts
    return (
      <ul className={styles.container}>
      {
        edges.map(({ node }) => {
          const { title, excerpt, url, slug } = node.attributes;
          return (
            <li className={styles.li} key={slug}>
              <h5 className={styles.heading}>
                <a href={url}
                   className={styles.a}
                >{title}</a>
              </h5>
              <p className={styles.excerpt}>{excerpt}</p>
            </li>
          )
        })
      }
      </ul>
    )
  }
}

export default Relay.createContainer(PostsPage, {
  fragments: {
    root: () => Relay.QL`
      fragment on Query {
        posts(first: 50) {
          pageInfo { hasNextPage }
          edges {
            node {
              attributes { slug, timeToRead, title, url, excerpt }
            }
          }
      }
    }`
  }
});
