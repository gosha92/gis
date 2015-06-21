# -*- coding: utf-8 -*-

import json
from flask import Flask, redirect, url_for, request, jsonify

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

@app.route('/path')
def generatePath():
    try:
        # получаем от клиента индексы точек, которые нужно посетить
        indexes = eval(request.args.get('points'))
        # по индексам формируем массив точек с координатами
        pointsForPath = []
        with open('static/points.json', 'r') as f:
            points = json.load(f)
        for i in indexes:
            pointsForPath.append(
                {
                    "lat": points[i]["lat"],
                    "lon": points[i]["lon"],
                    "index": i
                }
            );
        # points, indexes = makePath(pointsForPath) <- отрабатывает алгоритм
        points = [[10, 10], [10, 20], [20, 20], [20, 10], [10, 10]]
    except:
        return jsonify(result=False)
    return jsonify(result=True, points=points, indexes=indexes)

@app.after_request
def add_header(response):
    response.headers['X-UA-Compatible'] = 'IE=Edge,chrome=1'
    response.headers['Cache-Control'] = 'public, max-age=0'
    return response

if __name__ == "__main__":
    app.run(debug=True)