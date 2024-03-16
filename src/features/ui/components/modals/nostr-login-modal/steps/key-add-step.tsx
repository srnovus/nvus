import { nip19 } from 'nostr-tools';
import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';

import EmojiGraphic from 'soapbox/components/emoji-graphic';
import { Button, Stack, Modal, Input, FormGroup, Form } from 'soapbox/components/ui';
import { NKeys } from 'soapbox/features/nostr/keys';

import NostrExtensionIndicator from '../components/nostr-extension-indicator';

interface IKeyAddStep {
  onClose(): void;
}

const KeyAddStep: React.FC<IKeyAddStep> = ({ onClose }) => {
  const [nsec, setNsec] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNsec(e.target.value);
    setError(undefined);
  };

  const handleSubmit = () => {
    try {
      const result = nip19.decode(nsec);
      if (result.type === 'nsec') {
        const seckey = result.data;
        NKeys.add(seckey);
        // TODO: log in, close modal
      }
    } catch (e) {
      setError('Invalid nsec');
    }
  };

  return (
    <Modal title={<FormattedMessage id='NOSTR_SIGNUP.key-add.title' defaultMessage='Import Key' />} onClose={onClose}>
      <Stack className='my-3' space={6}>
        <NostrExtensionIndicator />

        <EmojiGraphic emoji='🔑' />

        <Form onSubmit={handleSubmit}>
          <Stack space={6}>
            <FormGroup labelText='Secret key' errors={error ? [error] : []}>
              <Input
                value={nsec}
                type='password'
                onChange={handleChange}
                placeholder='nsec1…'
              />
            </FormGroup>

            <Button theme='accent' size='lg' type='submit'>
              Add Key
            </Button>
          </Stack>
        </Form>
      </Stack>
    </Modal>
  );
};

export default KeyAddStep;
