import { Component } from 'react';
import PropTypes from 'prop-types';

// Error boundaries have to be class components.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty">
          <p className="empty-title">This page ran into a problem</p>
          <div className="empty-body">
            <p>Try going back, or reload the page.</p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/')}>Go to overview</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = { children: PropTypes.node.isRequired };
