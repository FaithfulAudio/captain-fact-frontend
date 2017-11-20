import React from "react"
import { connect } from "react-redux"
import { Field, reduxForm, getFormValues } from 'redux-form'
import { translate } from 'react-i18next'
import isURL from 'validator/lib/isURL'
import classNames from 'classnames'

import { renderField, validateLength, cleanStrMultiline } from "../FormUtils"
import { COMMENT_LENGTH, USER_PICTURE_LARGE } from "../../constants"
import TextareaAutosize from "../FormUtils/TextareaAutosize"
import { Icon } from '../Utils/Icon'
import Tag from '../Utils/Tag'
import UserAppellation from '../Users/UserAppellation'
import { postComment } from '../../state/video_debate/comments/effects'
import UserPicture from '../Users/UserPicture'
import MediaLayout from '../Utils/MediaLayout'
import { handleFormEffectResponse } from '../../lib/handle_effect_response'
import { CommentDisplay } from './CommentDisplay'


const validate = ({ source, text }) => {
  const errors = {}
  const url = source ? source.url : null
  const hasValidUrl = url && isURL(url, {protocols: ['http', 'https']})
  if (url && !hasValidUrl)
    errors['source'] = {url: 'Invalid URL'}
  if (!hasValidUrl && !text)
    errors['text'] = true
  else if (text)
    validateLength(errors, 'text', text, COMMENT_LENGTH, "Comment")
  return errors
}

class CommentField extends React.PureComponent {
  render() {
    const { input, label, placeholder, isReply, meta: { submitting, error } } = this.props
    return (
      <p className="control">
        <TextareaAutosize {...input}
                          placeholder={placeholder ? placeholder : label}
                          disabled={submitting}
                          focus={isReply}/>
        <span className="comment-length">
          <span className={`value ${input.value.length > COMMENT_LENGTH[1] ? 'invalid' : ''}`}>
            {input.value.length}
          </span>
            &nbsp;/ {COMMENT_LENGTH[1]}
        </span>
        {error && <span className="help is-danger">{typeof(error) === 'string' ? error : error[0]}</span>}
      </p>
    )
  }
}

@connect((state, props) => ({
  formValues: getFormValues(props.form)(state),
  currentUser: state.CurrentUser.data
}), {postComment})
@reduxForm({form:'commentForm', validate})
@translate(['videoDebate', 'main'])
export class CommentForm extends React.PureComponent {
  postAndReset(postFunc) {
    return this.props.handleSubmit(comment => {
      if (comment.reply_to) {
        comment.reply_to_id = comment.reply_to.id
        delete(comment.reply_to)
      }
      return postFunc(comment).then(handleFormEffectResponse({
        onSuccess: () => this.props.reset()
      }))
    })
  }

  getSubmit(valid, sourceUrl, isReply) {
    const commonClasses = ['button', {'is-disabled': !valid}]
    const i18nParams = isReply ? {context: 'reply'} : null
    if (!sourceUrl) return ([
      <button key="comment" type="submit" className={classNames(commonClasses)}>
        {this.props.t('comment.post', i18nParams)}
      </button>
    ])
    else return ([
      <button key="comment" type="submit" className={classNames(commonClasses)}>
        {this.props.t('comment.post', i18nParams)}
      </button>,
      <button key="approve" type="submit" className={classNames(commonClasses, 'is-success')}
              onClick={this.postAndReset(values => this.props.postComment({...values, approve: true}))}>
        {this.props.t('comment.approve', i18nParams)}
      </button>,
      <button key="refute" type="submit" className={classNames(commonClasses, 'is-danger')}
              onClick={this.postAndReset(values => this.props.postComment({...values, approve: false}))}>
        {this.props.t('comment.refute', i18nParams)}
      </button>
    ])
  }

  render() {
    const { valid, formValues, currentUser, t } = this.props
    const sourceUrl = formValues && formValues.source ? formValues.source.url : null

    return (
      <MediaLayout
        ContainerType="form"
        containerProps={{onSubmit: this.postAndReset(c => this.props.postComment(c))}}
        className="comment-form"
        left={<UserPicture user={currentUser} size={USER_PICTURE_LARGE}/>}
        content={
          <div>
            {formValues && formValues.reply_to &&
            <div>
              <Tag size="medium" className="reply_to"
                   onClick={() => this.props.change('reply_to', null)}>
                <Icon name="times" isClickable={true}/>
                <span>
                  {t('comment.replyingTo')}&nbsp;
                  <UserAppellation user={formValues.reply_to.user}/>
                </span>
              </Tag>
              <CommentDisplay richMedias={false} withoutActions={true} withoutHeader={true} hideThread={true} className="quoted"
                              comment={formValues.reply_to}/>
              <br/>
            </div>
            }
            <Field component={ CommentField } className="textarea" name="text"
                   isReply={formValues && !!formValues.reply_to}
                   normalize={ cleanStrMultiline }
                   placeholder={t('comment.writeComment')}/>
            <div className="level">
              <Field component={ renderField } name="source.url"
                     label={t('comment.addSource')}
                     normalize={s => s.trim()}/>
              <div className="submit-btns">
                { this.getSubmit(valid, sourceUrl, formValues && formValues.reply_to) }
              </div>
            </div>
          </div>
        }
      />
    )
  }
}
