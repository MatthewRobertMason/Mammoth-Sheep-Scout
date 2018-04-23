import json
from flask import Flask, jsonify
from functools import wraps
from flask import request, current_app

app = Flask("rhythm-command-score")


def jsonp(func):
    """Wraps JSONified output for JSONP requests."""
    @wraps(func)
    def decorated_function(*args, **kwargs):
        callback = request.args.get('callback', False)
        if callback:
            data = bytes(func(*args, **kwargs).data)
            content = callback.encode('utf-8') + b'(' + data.strip(b'b') + b')'
            mimetype = 'application/javascript'
            return current_app.response_class(content, mimetype=mimetype)
        else:
            return func(*args, **kwargs)
    return decorated_function


@app.route("/board")
@jsonp
def board():
    try:
        return jsonify(json.load(open('important-data.json', 'r')))
    except Exception as error:
        print(error)
        return jsonify({})


def cleanName(name):
    return name


@app.route("/send")
@jsonp
def setValue():
    try:
        username = request.args['username'][:20]
        song = request.args['song'][:100]
        difficulty = request.args['difficulty'][:20]
        score = [request.args['victory'][:10], request.args['defeat'][:10]]

        print(username, song, score)

        try:
            data = json.load(open('important-data.json', 'r'))
        except:
            data = {}

        if song not in data:
            data[song] = {}
        if difficulty not in data[song]:
            data[song][difficulty] = {}
        data[song][difficulty][username] = score

        json.dump(data, open('important-data.json', 'w'))

    except Exception as error:
        print(error)

    finally:
        return jsonify({'status': 'ok'})
