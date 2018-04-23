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


def best_rows(data, number, index):
    data.sort(key=lambda row: row[1][index], reverse=True)
    return data[:number], data[number:]


def choose_best(data):
    data = list(data.items())
    best, data = best_rows(data, 5, 0)
    worst, _ = best_rows(data, 3, 1)
    return best + worst


def format_difficulty(data):
    return {diff: choose_best(row) for diff, row in data.items()}


def format_leaderboard(data):
    return {song: format_difficulty(row) for song, row in data.items()}


@app.route("/board")
@jsonp
def board():
    try:
        return jsonify(format_leaderboard(json.load(open('important-data.json', 'r'))))
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


if __name__ == "__main__":
    cert = '/etc/letsencrypt/live/jam-stats.douglass.ca/cert.pem'
    key = '/etc/letsencrypt/live/jam-stats.douglass.ca/privkey.pem'
    app.run(ssl_context=(cert, key), host='0.0.0.0')
