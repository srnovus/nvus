import { OrderedSet as ImmutableOrderedSet } from 'immutable';
import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import {
  fetchAccount,
  fetchFollowing,
  expandFollowing,
  fetchAccountByUsername,
} from 'soapbox/actions/accounts';
import MissingIndicator from 'soapbox/components/missing-indicator';
import ScrollableList from 'soapbox/components/scrollable-list';
import { Column, Spinner } from 'soapbox/components/ui';
import AccountContainer from 'soapbox/containers/account-container';
import { useAppDispatch, useAppSelector, useFeatures, useOwnAccount } from 'soapbox/hooks';
import { findAccountByUsername } from 'soapbox/selectors';

const messages = defineMessages({
  heading: { id: 'column.following', defaultMessage: 'Following' },
});

interface IFollowing {
  params?: {
    username?: string,
  }
}

/** Displays a list of accounts the given user is following. */
const Following: React.FC<IFollowing> = (props) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const features = useFeatures();
  const ownAccount = useOwnAccount();

  const [loading, setLoading] = useState(true);

  const username = props.params?.username || '';
  const account = useAppSelector(state => findAccountByUsername(state, username));
  const isOwnAccount = username.toLowerCase() === ownAccount?.username?.toLowerCase();

  const accountIds = useAppSelector(state => state.user_lists.following.get(account!?.id)?.items || ImmutableOrderedSet<string>());
  const hasMore = useAppSelector(state => !!state.user_lists.following.get(account!?.id)?.next);

  const isUnavailable = useAppSelector(state => {
    const blockedBy = state.relationships.getIn([account?.id, 'blocked_by']) === true;
    return isOwnAccount ? false : (blockedBy && !features.blockersVisible);
  });

  const handleLoadMore = useCallback(debounce(() => {
    if (account) {
      dispatch(expandFollowing(account.id));
    }
  }, 300, { leading: true }), [account?.id]);

  useEffect(() => {
    let promises = [];

    if (account) {
      promises = [
        dispatch(fetchAccount(account.id)),
        dispatch(fetchFollowing(account.id)),
      ];
    } else {
      promises = [
        dispatch(fetchAccountByUsername(username)),
      ];
    }

    Promise.all(promises)
      .then(() => setLoading(false))
      .catch(() => setLoading(false));

  }, [account?.id, username]);

  if (loading && accountIds.isEmpty()) {
    return (
      <Spinner />
    );
  }

  if (!account) {
    return (
      <MissingIndicator />
    );
  }

  if (isUnavailable) {
    return (
      <div className='empty-column-indicator'>
        <FormattedMessage id='empty_column.account_unavailable' defaultMessage='Profile unavailable' />
      </div>
    );
  }

  return (
    <Column label={intl.formatMessage(messages.heading)} transparent>
      <ScrollableList
        scrollKey='following'
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        emptyMessage={<FormattedMessage id='account.follows.empty' defaultMessage="This user doesn't follow anyone yet." />}
        itemClassName='pb-4'
      >
        {accountIds.map(id =>
          <AccountContainer key={id} id={id} />,
        )}
      </ScrollableList>
    </Column>
  );
};

export default Following;