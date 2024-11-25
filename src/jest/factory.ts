import { GroupRoles } from 'soapbox/schemas/group-member.ts';
import {
  accountSchema,
  cardSchema,
  groupMemberSchema,
  groupRelationshipSchema,
  groupSchema,
  groupTagSchema,
  relationshipSchema,
  statusSchema,
  type Account,
  type Card,
  type Group,
  type GroupMember,
  type GroupRelationship,
  type GroupTag,
  type Relationship,
  type Status,
} from 'soapbox/schemas/index.ts';
import { InstanceV2, instanceV2Schema } from 'soapbox/schemas/instance.ts';

import type { PartialDeep } from 'type-fest';

// TODO: there's probably a better way to create these factory functions.
// This looks promising but didn't work on my first attempt: https://github.com/anatine/zod-plugins/tree/main/packages/zod-mock

function buildAccount(props: PartialDeep<Account> = {}): Account {
  return accountSchema.parse(Object.assign({
    id: crypto.randomUUID(),
    url: `https://soapbox.test/users/${crypto.randomUUID()}`,
  }, props));
}

function buildCard(props: PartialDeep<Card> = {}): Card {
  return cardSchema.parse(Object.assign({
    url: 'https://soapbox.test',
  }, props));
}

function buildGroup(props: PartialDeep<Group> = {}): Group {
  return groupSchema.parse(Object.assign({
    id: crypto.randomUUID(),
    owner: {
      id: crypto.randomUUID(),
    },
  }, props));
}

function buildGroupRelationship(props: PartialDeep<GroupRelationship> = {}): GroupRelationship {
  return groupRelationshipSchema.parse(Object.assign({
    id: crypto.randomUUID(),
  }, props));
}

function buildGroupTag(props: PartialDeep<GroupTag> = {}): GroupTag {
  return groupTagSchema.parse(Object.assign({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }, props));
}

function buildGroupMember(
  props: PartialDeep<GroupMember> = {},
  accountProps: PartialDeep<Account> = {},
): GroupMember {
  return groupMemberSchema.parse(Object.assign({
    id: crypto.randomUUID(),
    account: buildAccount(accountProps),
    role: GroupRoles.USER,
  }, props));
}

function buildInstance(props: PartialDeep<InstanceV2> = {}) {
  return instanceV2Schema.parse(props);
}

function buildRelationship(props: PartialDeep<Relationship> = {}): Relationship {
  return relationshipSchema.parse(Object.assign({
    id: crypto.randomUUID(),
  }, props));
}

function buildStatus(props: PartialDeep<Status> = {}) {
  return statusSchema.parse(Object.assign({
    id: crypto.randomUUID(),
    account: buildAccount(),
  }, props));
}

export {
  buildAccount,
  buildCard,
  buildGroup,
  buildGroupMember,
  buildGroupRelationship,
  buildGroupTag,
  buildInstance,
  buildRelationship,
  buildStatus,
};