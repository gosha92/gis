# from collections import namedtuple
from collections import deque
import json


class Grid(object):
    def __init__(self, max_x, max_y, busy_points):
        self.busy_points = set(busy_points)
        self.max_x = max_x
        self.max_y = max_y

    def find_path(self, frm, to):
        queue = deque()
        queue.append(frm)

        prev = {frm: None}
        found = False

        while queue and not found:
            point = queue.popleft()
            neighbours = self._neighbours(point)
            for n in neighbours:
                if n not in prev:
                    prev[n] = point
                    if n == to:
                        found = True
                        break
                    queue.append(n)

        path = []
        current = to
        while current is not None:
            path.append(current)
            current = prev[current]

        path = list(reversed(path))

        return path

    def _neighbours(self, point):
        x, y = point

        res = [(x, y - 1), (x, y + 1),
               (x - 1, y), (x + 1, y)]

        res = [(x, y) for x, y in res if 0 <= x <= self.max_x and
                                         0 <= y <= self.max_y and
                                         (x, y) not in self.busy_points]
        return res


def relax(path, busy_points):
    if len(path) == 2:
        return path

    busy_points = set(busy_points)

    def get_line(p1, p2):
        x1, y1 = p1
        x2, y2 = p2
        line = {p1, p2}

        x_delta = (x1 - x2) / 100.
        y_delta = (y1 - y2) / 100.

        for i in range(100):
            point = (int(x2 + i * x_delta),
                     int(y2 + i * y_delta))
            line.add(point)
        return line

    path = path[:]

    def _relax(lst):
        for i, p in enumerate(lst[1:]):
            line = get_line(lst[0], p)
            if line & busy_points:
                return lst[:1] + lst[i:]
        return [lst[0], lst[-1]]

    def iterate(lst):
        new_lst = _relax(lst)
        new_lst = list(reversed(new_lst))
        new_lst = _relax(new_lst)
        new_lst = list(reversed(new_lst))

        # return new_lst  # enable to optimize

        if lst == new_lst:
            return lst

        if len(new_lst) <= 4:
            return new_lst

        new_lst[1:-1] = iterate(new_lst[1:-1])
        return new_lst

    path = iterate(path)
    # print(path)
    return path


with open('static/island_points.json') as fin:
    island_points = json.load(fin)
island_busy = [(p['lat'], p['lon']) for p in island_points]
island_busy = set(island_busy)

with open('static/beach_points.json') as fin:
    beach_points = json.load(fin)
beach_busy = [(p['lat'], p['lon']) for p in beach_points]
beach_busy = set(beach_busy)


def get_shortest_path(geo1, geo2):
    min_lat = min(lat for lat, lon in beach_busy)
    min_lon = min(lon for lat, lon in beach_busy)
    max_lat = max(lat for lat, lon in beach_busy)
    max_lon = max(lon for lat, lon in beach_busy)
    # print(min_lat, max_lat)
    # print(min_lon, max_lon)
    # print(geo1)
    # print(geo2)

    grid_size = 102

    def mutate_lat(lat):
        return int(grid_size * (lat - min_lat) / (max_lat - min_lat))

    def mutate_lon(lon):
        return int(grid_size * (lon - min_lon) / (max_lon - min_lon))

    def mutate(point):
        return (mutate_lat(point['lat']), mutate_lon(point['lon']))

    busy_points = map(mutate, island_points) + \
                  map(mutate, beach_points)

    mutated_geo1 = mutate(geo1)
    mutated_geo2 = mutate(geo2)

    grid = Grid(grid_size, grid_size, busy_points)
    path = grid.find_path(mutated_geo1, mutated_geo2)

    def demutate_lat(lat):
        return min_lat + (max_lat - min_lat) * (float(lat) / grid_size)

    def demutate_lon(lon):
        return min_lon + (max_lon - min_lon) * (float(lon) / grid_size)

    def demutate(point):
        lat, lon = point
        return {'lat': demutate_lat(lat),
                'lon': demutate_lon(lon)}

    path = relax(path, busy_points)

    path = map(demutate, path)
    path[0] = geo1
    path[-1] = geo2

    return path


def main():
    grid = Grid(100, 100, [(0, 0), (5, 5), (8, 8), (8, 9)])
    print(grid.find_path((0, 1), (100, 100)))


if __name__ == '__main__':
    main()
