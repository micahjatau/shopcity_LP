import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import {
  startSupabaseAuthStub,
  TEST_SUPABASE_ANON_KEY,
  TEST_SUPABASE_SERVICE_ROLE_KEY,
} from './supabase-auth-stub.mjs';

const authOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
};

test('local Supabase Auth stub supports seed, password login, updates and deletion', async () => {
  const stub = await startSupabaseAuthStub();
  const admin = createClient(
    stub.url,
    TEST_SUPABASE_SERVICE_ROLE_KEY,
    authOptions,
  );
  const publicClient = createClient(
    stub.url,
    TEST_SUPABASE_ANON_KEY,
    authOptions,
  );

  try {
    const ready = await fetch(`${stub.url}/auth/v1/health`);
    assert.equal(ready.status, 200);

    const listed = await admin.auth.admin.listUsers();
    assert.equal(listed.error, null);
    assert.equal(listed.data.users.length, 0);

    const created = await admin.auth.admin.createUser({
      email: 'admin@shopcity.local',
      password: 'test-password-which-is-not-logged',
      email_confirm: true,
    });
    assert.equal(created.error, null);
    assert.ok(created.data.user?.id);

    const signedIn = await publicClient.auth.signInWithPassword({
      email: 'admin@shopcity.local',
      password: 'test-password-which-is-not-logged',
    });
    assert.equal(signedIn.error, null);
    assert.equal(signedIn.data.user?.id, created.data.user.id);

    const rejected = await publicClient.auth.signInWithPassword({
      email: 'admin@shopcity.local',
      password: 'wrong-test-password',
    });
    assert.ok(rejected.error);
    assert.equal(rejected.data.user, null);

    const changed = await admin.auth.admin.updateUserById(
      created.data.user.id,
      {
        password: 'updated-test-password',
        email_confirm: true,
      },
    );
    assert.equal(changed.error, null);

    const signedInAfterUpdate = await publicClient.auth.signInWithPassword({
      email: 'admin@shopcity.local',
      password: 'updated-test-password',
    });
    assert.equal(signedInAfterUpdate.error, null);
    assert.equal(signedInAfterUpdate.data.user?.id, created.data.user.id);

    const deleted = await admin.auth.admin.deleteUser(created.data.user.id);
    assert.equal(deleted.error, null);

    const afterDelete = await admin.auth.admin.listUsers();
    assert.equal(afterDelete.data.users.length, 0);
  } finally {
    await stub.close();
  }
});
