import copy
import io
import json

import pytest
from PIL import Image


def event_payload(**changes):
    payload = {
        'marker': 'Workshop', 'title': 'Backend workshop', 'subtitle': 'Build together',
        'category': 'Event', 'dateLabel': '10 DEC 2026', 'location': 'ICT lab',
        'description': 'A hands-on workshop.', 'status': 'Published',
        'showOnHome': True, 'order': 3,
    }
    return {**payload, **changes}


def png():
    output = io.BytesIO()
    Image.new('RGB', (2, 2), 'red').save(output, format='PNG')
    return output.getvalue()


def test_public_content_and_write_auth(client):
    for section in ('site', 'home', 'recruitment', 'legal'):
        response = client.get(f'/api/v1/content/{section}')
        assert response.status_code == 200
        assert client.put(f'/api/v1/content/{section}', json=response.json()).status_code == 401
    assert client.post('/api/v1/content/reset').status_code == 401
    assert client.post('/api/v1/events', json=event_payload()).status_code == 401
    assert client.patch('/api/v1/events/missing', json={'title': 'No'}).status_code == 401
    assert client.delete('/api/v1/events/missing').status_code == 401


@pytest.mark.parametrize('section', ['site', 'home', 'recruitment', 'legal'])
def test_content_round_trip(admin, section):
    original = admin.get(f'/api/v1/content/{section}').json()
    saved = admin.put(f'/api/v1/content/{section}', json=original)
    assert saved.status_code == 200, saved.text
    assert saved.json() == original
    assert admin.get(f'/api/v1/content/{section}').json() == original


@pytest.mark.parametrize('mutation', ['cards', 'teams', 'url', 'nested_extra'])
def test_home_nested_validation_is_atomic(admin, mutation):
    original = admin.get('/api/v1/content/home').json()
    changed = copy.deepcopy(original)
    if mutation == 'cards':
        changed['whyUs']['cards'].pop()
    elif mutation == 'teams':
        changed['teams']['items'].append(changed['teams']['items'][0])
    elif mutation == 'url':
        changed['location']['mapUrl'] = 'not a URL'
    else:
        changed['faq']['askModal']['unexpected'] = 'forbidden'
    response = admin.put('/api/v1/content/home', json=changed)
    assert response.status_code == 422, response.text
    assert admin.get('/api/v1/content/home').json() == original


def test_recruitment_boolean_and_nested_fields(admin):
    original = admin.get('/api/v1/content/recruitment').json()
    changed = copy.deepcopy(original)
    changed['isOpen'] = 'false'
    assert admin.put('/api/v1/content/recruitment', json=changed).status_code == 422
    changed = copy.deepcopy(original)
    del changed['openedCopy']['sections']['personal']['fields']['email']
    assert admin.put('/api/v1/content/recruitment', json=changed).status_code == 422


def test_event_visibility_filters_and_order(admin):
    draft = admin.post('/api/v1/events', json=event_payload(status='Draft', order=0)).json()
    published = admin.post('/api/v1/events', json=event_payload(order=1, showOnHome=False)).json()
    assert draft['id'] in {item['id'] for item in admin.get('/api/v1/events').json()}
    assert published['id'] not in {
        item['id'] for item in admin.get('/api/v1/events?showOnHome=true').json()
    }
    admin.cookies.clear()
    for query in ('', '?published=false', '?published=true', '?showOnHome=true'):
        response = admin.get('/api/v1/events' + query)
        assert response.status_code == 200
        items = response.json()
        assert all(item['status'] == 'Published' for item in items)
        assert draft['id'] not in {item['id'] for item in items}
        assert [item['order'] for item in items] == sorted(item['order'] for item in items)


def test_partial_update_cover_semantics_and_delete(admin):
    cover = {'src': '/images/example.png', 'alt': ''}
    response = admin.post('/api/v1/events', json=event_payload(coverImage=cover))
    assert response.status_code == 201, response.text
    created = response.json()
    path = '/api/v1/events/' + created['id']
    response = admin.patch(path, json={'title': 'Renamed'})
    assert response.status_code == 200
    assert response.json()['coverImage'] == cover
    assert response.json()['description'] == created['description']
    response = admin.patch(path, json={'coverImage': None})
    assert response.status_code == 200
    assert 'coverImage' not in response.json()
    assert admin.delete(path).status_code == 204
    assert admin.patch(path, json={'title': 'Gone'}).status_code == 404


@pytest.mark.parametrize('patch', [
    {'status': 'Hidden'}, {'showOnHome': 'false'}, {'order': -1},
    {'order': True}, {'title': None}, {'updatedAt': 'forged'}, {'id': 'forged'},
    {'coverImage': {'src': '/image.png'}},
])
def test_invalid_event_patch_does_not_mutate(admin, patch):
    created = admin.post('/api/v1/events', json=event_payload()).json()
    assert admin.patch('/api/v1/events/' + created['id'], json=patch).status_code == 422
    stored = next(item for item in admin.get('/api/v1/events').json() if item['id'] == created['id'])
    assert stored == created


def test_event_creation_requires_complete_payload(admin):
    assert admin.post('/api/v1/events', json={'title': 'Incomplete'}).status_code == 422
    assert admin.post('/api/v1/events', content='{bad', headers={'Content-Type': 'application/json'}).status_code == 422
    assert admin.post('/api/v1/events', json=[]).status_code == 422


def test_event_multipart_media_registration_and_preservation(admin):
    response = admin.post('/api/v1/events', data={'payload': json.dumps(event_payload())},
                          files={'cover': ('cover.png', png(), 'image/png')})
    assert response.status_code == 201, response.text
    event = response.json()
    media_id = event['coverImage']['id']
    media = next(item for item in admin.get('/api/v1/media').json() if item['id'] == media_id)
    assert event['coverImage']['src'] == media['url']
    assert event['coverImage']['alt'] == event['title']
    response = admin.patch('/api/v1/events/' + event['id'], data={'payload': json.dumps({'title': 'New cover'})},
                           files={'cover': ('replacement.png', png(), 'image/png')})
    assert response.status_code == 200, response.text
    new_id = response.json()['coverImage']['id']
    assert new_id != media_id
    assert admin.delete('/api/v1/events/' + event['id']).status_code == 204
    assert {media_id, new_id} <= {item['id'] for item in admin.get('/api/v1/media').json()}


def test_invalid_upload_rolls_back_event_and_media(admin):
    before_events = admin.get('/api/v1/events').json()
    before_media = admin.get('/api/v1/media').json()
    response = admin.post('/api/v1/events', data={'payload': json.dumps(event_payload())},
                          files={'cover': ('fake.png', b'not an image', 'image/png')})
    assert response.status_code in (400, 415, 422)
    assert admin.get('/api/v1/events').json() == before_events
    assert admin.get('/api/v1/media').json() == before_media


def test_content_reset_does_not_reset_events_or_media(admin):
    original = admin.get('/api/v1/content/site').json()
    changed = {**original, 'brandName': 'Changed brand'}
    assert admin.put('/api/v1/content/site', json=changed).status_code == 200
    event = admin.post('/api/v1/events', json=event_payload()).json()
    media = admin.get('/api/v1/media').json()
    assert admin.post('/api/v1/content/reset').status_code == 204
    assert admin.get('/api/v1/content/site').json() == original
    assert event in admin.get('/api/v1/events').json()
    assert admin.get('/api/v1/media').json() == media


def test_uploaded_file_removed_when_event_persistence_fails(admin, app, settings, monkeypatch):
    store = app.state.store
    original_put = type(store).put
    before_media = admin.get('/api/v1/media').json()
    uploads = settings.data_dir / 'uploads'
    before_files = set(uploads.iterdir()) if uploads.exists() else set()

    def failing_put(conn, kind, identifier, data):
        if kind == 'event':
            raise RuntimeError('Simulated event persistence failure')
        return original_put(conn, kind, identifier, data)

    with monkeypatch.context() as patch:
        patch.setattr(type(store), 'put', staticmethod(failing_put))
        with pytest.raises(RuntimeError, match='Simulated event persistence failure'):
            admin.post('/api/v1/events', data={'payload': json.dumps(event_payload())},
                       files={'cover': ('cover.png', png(), 'image/png')})
    assert admin.get('/api/v1/media').json() == before_media
    assert set(uploads.iterdir()) == before_files
