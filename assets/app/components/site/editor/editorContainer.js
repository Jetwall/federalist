import React from 'react';

import { decodeB64 } from '../../../util/encoding'

import PageMetadata from './pageMetadata';
import EditorContents from './editorContents';
import ImagePicker from './imagePicker';
import Codemirror from './codemirror';
import Prosemirror from './prosemirror';

import documentStrategy from '../../../util/documentStrategy';

import alertActions from '../../../actions/alertActions';
import siteActions from '../../../actions/siteActions';

import convertFileToData from '../../../util/convertFileToData';

const propTypes = {
  site: React.PropTypes.object
};

let insertFn;

class Editor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};
    this.submitFile = this.submitFile.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.onOpenImagePicker = this.onOpenImagePicker.bind(this);
    this.onCloseImagePicker = this.onCloseImagePicker.bind(this);
    this.onConfirmInsertImage = this.onConfirmInsertImage.bind(this);
    this.onUpload = this.onUpload.bind(this);
  }

  componentDidMount() {
    // This action should be triggered when a user first loads this view,
    // either visiting it directly from the url bar or navigating here
    // with react router
    siteActions.fetchFileContent(this.props.site, this.path);
  }

  componentWillReceiveProps(nextProps) {
    const nextState = this.getStateWithProps(nextProps);
    this.setState(nextState);
  }

  registerInsertImageFn(fn) {
    insertFn = fn;
  }

  onOpenImagePicker() {
    this.setState({
      imagePicker: true
    });
  }

  onCloseImagePicker() {
    this.setState({
      imagePicker: false
    });
  }

  onConfirmInsertImage(fileName) {
    const asset = this.props.site.assets.find((asset) => asset.path === fileName);
    insertFn(asset);
  }

  getStateWithProps(props) {
    const file = this.getCurrentFile(props) || {};
    const path = file.path || false;
    const { frontmatter, markdown, raw, content } = documentStrategy(file);

    return {
      encoded: file.content || false,
      frontmatter,
      markdown,
      message: false,
      path,
      raw: content,
      sha: file.sha || false,
      imagePicker: false
    };
  }

  submitFile() {
    const { site } = this.props;
    let { frontmatter, markdown, message, path, sha } = this.state;
    let content = markdown;

    if (!path) {
      return alertActions.alertError('File must have a name');
    }

    if (message === '') {
      return alertActions.alertError('You must supply a commit message');
    }

    if (frontmatter) {
      content = `---\n${frontmatter}\n---\n${markdown}`;
    }
    else if (frontmatter && !markdown) {
      content = frontmatter;
    }

    if (this.props.route.isNewPage) {
      path = `${path}.md`;
    }

    siteActions.createCommit(site, path, content, message, sha);
  }

  handleChange(name, value) {
    const nextState = {};
    nextState[name] = value;
    this.setState(nextState);
  }

  getCurrentFile(props) {
    const files = props.site.files || [];

    return files.find((file) => {
      return file.path === this.path;
    }) || {};
  }

  get path() {
    const params = this.props.params;
    if (params.splat) {
      return `${params.splat}/${params.fileName}`;
    }
    return params.fileName;
  }

  getComputedMessage() {
    const newPage = this.props.route.isNewPage;
    const hasMessage = this.state.message || this.state.message === '';
    if (hasMessage) return this.state.message;
    if (newPage) return `New page added at ${this.state.path}`;
    return `Changes made to ${this.state.path}`;
  }

  getNewPage() {
    const newPage = this.props.route.isNewPage;

    if (!newPage) {
      return null;
    }

    return (
      <PageMetadata
        path={this.state.path}
        handleChange={this.handleChange}/>
    );
  }

  getImagePicker() {
    return !this.state.imagePicker ? null :
      <ImagePicker
        handleConfirm={this.onConfirmInsertImage}
        handleUpload={this.onUpload}
        handleCancel={this.onCloseImagePicker}
        assets={this.props.site.assets}
      />;
  }

  onUpload(file) {
    const { site } = this.props;

    // TODO: should an action creator do this? Do we want a seperate action for
    // uploading images (and possibly other file types in the future) that
    // conforms to the createCommit interface in the github api service?
    convertFileToData(file).then(function (fileData) {
      const fileName = file.name;
      // TODO: hardcoded for now, will need to parse the _config.yml file
      // at some point in the future to dtermine if the federalist user has
      // specified a different content directory
      const path = `assets/${fileName}`;
      const message = `Uploads ${fileName} to project`;

      siteActions.createCommit(site, path, fileData, message);
    });
  }

  // TODO: break up this component. We need an intermediate form component that
  // handles submission of the form content. This container should just render
  // the form and the image picker, and probably call actions after content has
  // been verified.
  render() {
    const { props } = this;
    const computedMessage = this.getComputedMessage();
    const file = this.getCurrentFile(props);
    const content = decodeB64(file.content);
    const { frontmatter, markdown } = this.splitContent(content);

    return (
      <div>
        {this.getImagePicker()}
        {this.getNewPage()}

        <Codemirror
          initialFrontmatterContent={ frontmatter }
          onChange={ (frontmatter) => {
            this.handleChange('frontmatter', frontmatter)
          }}
        />
        <Prosemirror
          initialMarkdownContent={ markdown }
          onChange={ (markdown) => {
            this.handleChange('markdown', markdown);
          }}
          handleToggleImages={this.onOpenImagePicker}
          registerInsertImage={this.registerInsertImageFn}
        />
        <div className="usa-alert usa-alert-info">
          <div className="usa-alert-body">
            <h3 className="usa-alert-heading"></h3>
            <p className="usa-alert-text">Make this a helpful save message for yourself and future collaborators.</p>
            <input type="text" name="message"
              value={ computedMessage }
              onChange={ (event) => {
                this.handleChange('message', event.target.value);
              }}
            />
            <button onClick={this.submitFile}>Submit</button>
          </div>
        </div>
      </div>
    );
  }
}

Editor.propTypes = propTypes;

export default Editor;
