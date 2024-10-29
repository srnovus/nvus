import {
  NRelay,
  NostrConnectRequest,
  NostrConnectResponse,
  NostrEvent,
  NostrFilter,
  NostrSigner,
  NSchema as n,
} from '@nostrify/nostrify';

interface NBunkerSigners {
  user: NostrSigner;
  bunker: NostrSigner;
}

interface NBunkerConnection {
  authorizedPubkey: string;
  signers: NBunkerSigners;
}

export interface NBunkerOpts {
  relay: NRelay;
  connection?: NBunkerConnection;
  onSubscribed(): void;
}

export class NBunker {

  private relay: NRelay;
  private connection?: NBunkerConnection;
  private onSubscribed: () => void;

  private controller = new AbortController();

  constructor(opts: NBunkerOpts) {
    this.relay = opts.relay;
    this.connection = opts.connection;
    this.onSubscribed = opts.onSubscribed;

    this.open();
  }

  async open() {
    if (this.connection) {
      this.subscribeConnection(this.connection);
    }
    this.onSubscribed();
  }

  private async subscribeConnection(connection: NBunkerConnection): Promise<void> {
    const { authorizedPubkey, signers } = connection;
    const bunkerPubkey = await signers.bunker.getPublicKey();

    const filters: NostrFilter[] = [
      { kinds: [24133], authors: [authorizedPubkey], '#p': [bunkerPubkey], limit: 0 },
    ];

    for await (const { event, request } of this.subscribe(filters, signers)) {
      this.handleRequest(event, request, connection);
    }
  }

  private async *subscribe(filters: NostrFilter[], signers: NBunkerSigners): AsyncIterable<{ event: NostrEvent; request: NostrConnectRequest }> {
    const signal = this.controller.signal;

    for await (const msg of this.relay.req(filters, { signal })) {
      if (msg[0] === 'EVENT') {
        const [,, event] = msg;

        try {
          const decrypted = await this.decrypt(signers.bunker, event.pubkey, event.content);
          const request = n.json().pipe(n.connectRequest()).parse(decrypted);
          yield { event, request };
        } catch (error) {
          console.warn(error);
        }
      }
    }
  }

  private async handleRequest(event: NostrEvent, request: NostrConnectRequest, connection: NBunkerConnection): Promise<void> {
    const { signers, authorizedPubkey } = connection;
    const { user } = signers;

    // Prevent unauthorized access.
    if (event.pubkey !== authorizedPubkey) {
      return;
    }

    // Authorized methods.
    switch (request.method) {
      case 'sign_event':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: JSON.stringify(await user.signEvent(JSON.parse(request.params[0]))),
        });
      case 'ping':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: 'pong',
        });
      case 'get_relays':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: JSON.stringify(await user.getRelays?.() ?? []),
        });
      case 'get_public_key':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: await user.getPublicKey(),
        });
      case 'nip04_encrypt':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: await user.nip04!.encrypt(request.params[0], request.params[1]),
        });
      case 'nip04_decrypt':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: await user.nip04!.decrypt(request.params[0], request.params[1]),
        });
      case 'nip44_encrypt':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: await user.nip44!.encrypt(request.params[0], request.params[1]),
        });
      case 'nip44_decrypt':
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: await user.nip44!.decrypt(request.params[0], request.params[1]),
        });
      default:
        return this.sendResponse(event.pubkey, {
          id: request.id,
          result: '',
          error: `Unrecognized method: ${request.method}`,
        });
    }
  }

  private async sendResponse(pubkey: string, response: NostrConnectResponse): Promise<void> {
    const { user } = this.connection?.signers ?? {};

    if (!user) {
      return;
    }

    const event = await user.signEvent({
      kind: 24133,
      content: await user.nip04!.encrypt(pubkey, JSON.stringify(response)),
      tags: [['p', pubkey]],
      created_at: Math.floor(Date.now() / 1000),
    });

    await this.relay.event(event);
  }

  /** Auto-decrypt NIP-44 or NIP-04 ciphertext. */
  private async decrypt(signer: NostrSigner, pubkey: string, ciphertext: string): Promise<string> {
    try {
      return await signer.nip44!.decrypt(pubkey, ciphertext);
    } catch {
      return await signer.nip04!.decrypt(pubkey, ciphertext);
    }
  }

  close() {
    this.controller.abort();
  }

}