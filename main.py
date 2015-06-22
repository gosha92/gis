# -*- coding: utf-8 -*-

import json
import search
import itertools
from flask import Flask, request, jsonify
from tsp_solver.greedy import solve_tsp


app = Flask(__name__)


@app.route('/')
def root():
    return app.send_static_file('index.html')


@app.route('/static/<filename>')
def getPoints(filename):
    return app.send_static_file(filename.encode("windows-1251"))


@app.route('/add')
def addPoint():
    try:
        with open('static/points.json', 'r') as f:
            points = json.load(f)
        points.append(
            {
                "lon": float(request.args.get('lon')),
                "lat": float(request.args.get('lat')),
                "name": request.args.get('name'),
                "desc": request.args.get('desc')
            }
        )
        with open('static/points.json', 'w') as f:
            json.dump(points, f)
    except:
        return jsonify(result=False)
    return jsonify(result=True)


@app.route('/del')
def deletePoint():
    try:
        with open('static/points.json', 'r') as f:
            points = json.load(f)
        del points[int(request.args.get('index'))]
        with open('static/points.json', 'w') as f:
            json.dump(points, f)
    except:
        return jsonify(result=False)
    return jsonify(result=True)


def path_len(path):
    size = 0
    for x, y in zip(path[1:], path[:-1]):
        size += ((x['lat'] - y['lat']) ** 2 + (x['lon'] - y['lon']) ** 2) ** 0.5
    return size


def make_all_paths(points):
    def to_key(p1, p2):
        p1, p2 = sorted([p1, p2])
        return (p1['local_idx'], p2['local_idx'])

    paths = dict()
    for p1, p2 in itertools.combinations(points, 2):
        path = search.get_shortest_path(p1, p2)
        size = path_len(path)
        paths[to_key(p1, p2)] = (path, size)

    return paths


def makePath(points):
    def to_key(p1, p2):
        p1, p2 = sorted([p1, p2])
        return (p1['local_idx'], p2['local_idx'])

    all_paths = make_all_paths(points)

    matrix = [[0] * len(points) for _ in range(len(points))]
    for (idx1, idx2), (path, size) in all_paths.items():
        matrix[idx1][idx2] = size
        matrix[idx2][idx1] = size

    indexes = solve_tsp(matrix)

    points_dict = {p['local_idx']: p for p in points}
    points_path = [points_dict[idx] for idx in indexes]
    print(indexes)

    full_path = []
    for p1, p2 in zip(points_path[:-1], points_path[1:]):
        path, _ = all_paths[to_key(p1, p2)]
        path = path[:]
        if path[0] != p1:
            path = list(reversed(path))
        full_path.extend(path)

    indexes = [p['index'] for p in points_path]
    return [(p['lat'], p['lon']) for p in full_path], indexes


@app.route('/path')
def generatePath():
    # получаем от клиента индексы точек, которые нужно посетить
    indexes = eval(request.args.get('points'))

    # по индексам формируем массив точек с координатами
    pointsForPath = []
    with open('static/points.json') as fin:
        points = json.load(fin)

    for i, index in enumerate(indexes):
        pointsForPath.append(
            {
                "lat": points[index]["lat"],
                "lon": points[index]["lon"],
                "index": index,
                "local_idx": i,
            }
        )

    path, indexes = makePath(pointsForPath)
    # возвращаем клиенту только индексы точек
    return jsonify(result=True, points=path, indexes=indexes)


@app.after_request
def add_header(response):
    response.headers['X-UA-Compatible'] = 'IE=Edge,chrome=1'
    response.headers['Cache-Control'] = 'public, max-age=0'
    return response

if __name__ == "__main__":
    app.run(debug=True)
