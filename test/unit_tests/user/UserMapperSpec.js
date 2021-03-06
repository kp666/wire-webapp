/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

// grunt test_init && grunt test_run:user/UserMapper

describe('User Mapper', function() {
  const asset_service = {
    generate_asset_url() {
      return 'FooBarURL';
    },
  };

  const mapper = new z.user.UserMapper(asset_service);
  mapper.logger.level = z.util.Logger.prototype.levels.ERROR;

  let self_user_payload = null;

  beforeEach(function() {
    self_user_payload = JSON.parse(JSON.stringify(payload.self.get));
  });

  describe('map_user_from_object', function() {
    it('can convert JSON into a single user entity', function() {
      const user_et = mapper.map_user_from_object(self_user_payload);
      expect(user_et.email()).toBe('jd@wire.com');
      expect(user_et.name()).toBe('John Doe');
      expect(user_et.phone()).toBe('+49177123456');
      expect(user_et.is_me).toBeFalsy();
      expect(user_et.accent_id()).toBe(z.config.ACCENT_ID.YELLOW);
    });

    it('returns undefined if input was undefined', function() {
      const user = mapper.map_user_from_object(undefined);
      expect(user).toBeUndefined();
    });

    it('can convert users with profile images marked as non public', function() {
      self_user_payload.picture[0].info.public = false;
      self_user_payload.picture[1].info.public = false;
      const user_et = mapper.map_user_from_object(self_user_payload);
      expect(user_et.name()).toBe('John Doe');
    });

    it('will return default accent color if null/undefined', function() {
      self_user_payload.accent_id = null;
      const user_et = mapper.map_user_from_object(self_user_payload);
      expect(user_et.name()).toBe('John Doe');
      expect(user_et.accent_id()).toBe(z.config.ACCENT_ID.BLUE);
    });

    it('will return default accent color if backend returns 0', function() {
      self_user_payload.accent_id = 0;
      const user_et = mapper.map_user_from_object(self_user_payload);
      expect(user_et.name()).toBe('John Doe');
      expect(user_et.joaat_hash).toBe(526273169);
      expect(user_et.accent_id()).toBe(z.config.ACCENT_ID.BLUE);
    });
  });

  describe('map_self_user_from_object', () =>
    it('can convert JSON into a single user entity', function() {
      const user_et = mapper.map_self_user_from_object(self_user_payload);
      expect(user_et.email()).toBe('jd@wire.com');
      expect(user_et.name()).toBe('John Doe');
      expect(user_et.phone()).toBe('+49177123456');
      expect(user_et.is_me).toBeTruthy();
      expect(user_et.locale).toBe('en');
      expect(user_et.accent_id()).toBe(z.config.ACCENT_ID.YELLOW);
    })
  );

  describe('map_users_from_object', function() {
    it('can convert JSON into multiple user entities', function() {
      const user_ets = mapper.map_users_from_object(payload.users.get.many);
      expect(user_ets.length).toBe(2);
      expect(user_ets[0].email()).toBe('jd@wire.com');
      expect(user_ets[1].name()).toBe('Jane Roe');
    });

    it('returns an empty array if input was undefined', function() {
      const user_ets = mapper.map_users_from_object(undefined);
      expect(user_ets).toBeDefined();
      expect(user_ets.length).toBe(0);
    });

    it('returns an empty array if input was an empty array', function() {
      const user_ets = mapper.map_users_from_object([]);
      expect(user_ets).toBeDefined();
      expect(user_ets.length).toBe(0);
    });
  });

  describe('update_user_from_object', function() {
    it('can update the accent color', function() {
      const user_et = new z.entity.User();
      user_et.id = entities.user.john_doe.id;
      const data = {'accent_id': 1, 'id': entities.user.john_doe.id};
      const updated_user_et = mapper.update_user_from_object(user_et, data);
      expect(updated_user_et.accent_id()).toBe(z.config.ACCENT_ID.BLUE);
    });

    it('can update the user name', function() {
      const user_et = new z.entity.User();
      user_et.id = entities.user.john_doe.id;
      const data = {'id': entities.user.john_doe.id, 'name': entities.user.jane_roe.name};
      const updated_user_et = mapper.update_user_from_object(user_et, data);
      expect(updated_user_et.name()).toBe(entities.user.jane_roe.name);
    });

    it('can update the user handle', function() {
      const user_et = new z.entity.User();
      user_et.id = entities.user.john_doe.id;
      const data = {'handle': entities.user.jane_roe.handle, 'id': entities.user.john_doe.id};
      const updated_user_et = mapper.update_user_from_object(user_et, data);
      expect(updated_user_et.username()).toBe(entities.user.jane_roe.handle);
    });

    it('cannot update the user name of a wrong user', function() {
      const user_et = new z.entity.User();
      user_et.id = entities.user.john_doe.id;
      const data = {'id': entities.user.jane_roe.id, 'name': entities.user.jane_roe.name};
      const func = () => mapper.update_user_from_object(user_et, data);
      expect(func).toThrow();
    });

    it('can update user with v3 assets', function() {
      const user_et = new z.entity.User();
      user_et.id = entities.user.john_doe.id;
      const data = {
        'assets': [
          {key: z.util.create_random_uuid(), size: 'preview', type: 'image'},
          {key: z.util.create_random_uuid(), size: 'complete', type: 'image'},
        ],
        'id': entities.user.john_doe.id,
        'name': entities.user.jane_roe.name,
      };
      const updated_user_et = mapper.update_user_from_object(user_et, data);
      expect(updated_user_et.preview_picture_resource()).toBeDefined();
      expect(updated_user_et.medium_picture_resource()).toBeDefined();
    });
  });
});
