// Карта
var myMap;
// Массив точек
var points = [];
// Кнопка "Построить маршрут"
var buildPathButton;
// Кнопка "Удалить маршрут"
var deletePathButton;
// Маршрут (ymaps.GeoObject)
var path;

// Добавляет элемент .point
// в #pointsContainer и добавляет
// точку в массив points
var $pointsContainer = $('#pointsContainer');
function createPoint(point) {
    index = points.length;
    var $point = $('<div class="point"><input data-index="' + index + '" class="addPointToMapCheckbox" type="checkbox"/>' + point.name + '</div>');
    $pointsContainer.append($point);
    pointGeoObject = new ymaps.GeoObject({
        geometry: {
            type: "Point",
            coordinates: [
                point.lat,
                point.lon
            ],
        },
        properties: {
            balloonContent: '<b>' + point.name + '</b><br/>' + point.desc + '<br/><button class="deletePointFromMapButton" data-index="' + index + '">Удалить точку</button>',
            hintContent: point.name
        },
    }, {
        preset: 'islands#blueCircleDotIcon'
    });
    point.onMap = false;
    point.element = $point;
    point.geoObject = pointGeoObject;
    points.push(point);
};

// Создание карты, получение
// набора точек из базы и
// создание точек; добавление
// кнопок "Добавить маршрут",
// "Удалить маршрут"
ymaps.ready(function(){
    myMap = new ymaps.Map('map', {
        center: [40, 69],
        zoom: 4,
        controls: ['typeSelector', 'rulerControl', 'zoomControl'],
        type: 'yandex#satellite'
    });
    jQuery.getJSON('static/points.json', function(points) {
        for(var i = 0; i < points.length; ++i)
            createPoint(points[i])
    });
    buildPathButton = new ymaps.control.Button({
        data: {
            content: 'Построить маршрут'
        },
        options: {
            maxWidth: 150,
            selectOnClick: false
        }
    });
    myMap.controls.add(buildPathButton, {float: 'right'});
    buildPathButton.events.add('click', buildPath);
    deletePathButton = new ymaps.control.Button({
        data: {
            content: 'Удалить маршрут'
        },
        options: {
            maxWidth: 150,
            selectOnClick: false
        }
    });
    myMap.controls.add(deletePathButton, {float: 'right'});
    deletePathButton.events.add('click', deletePath);
});

// Создание новой точки в базе,
// добавление точки в список
$pointNameInput = $('#pointNameInput');
$pointDescInput = $('#pointDescInput');
$pointLonInput = $('#pointLonInput');
$pointLatInput = $('#pointLatInput');
$('#createPointButton').on('click', function(e) {
    e.preventDefault();
    name = $pointNameInput.val();
    desc = $pointDescInput.val();
    lon = $pointLonInput.val();
    lat = $pointLatInput.val();
    $.getJSON('/add?name=' + name + '&desc=' + desc + '&lon=' + lon + '&lat=' + lat, function(response) {
        if (response.result === true) {
            createPoint({
                name: name,
                desc: desc,
                lon: lon,
                lat: lat
            });
            $pointNameInput.val('');
            $pointDescInput.val('');
            $pointLonInput.val('');
            $pointLatInput.val('');
        } else {
            alert("Параметры точки введены неправильно!");
        }
    });
});

// Удаление точки из базы (а 
// также с карты и из списка)
// ОТКЛЮЧИЛ, МОЖНО УДАЛИТЬ, ЗАЙДЯ
// ПО АДРЕСУ /del?index=N

// Нанесение точки на карту
$(document).on('click', '.addPointToMapCheckbox', function(){
    $this = $(this);
    index = $this.data('index');
    if ($this.is(':checked')) {
        points[index].onMap = true;
        myMap.geoObjects.add(points[index].geoObject);
    } else {
        points[index].onMap = false;
        myMap.geoObjects.remove(points[index].geoObject);
    }
    deletePath();
});

// Удаление точки с карты
$(document).on('click', '.deletePointFromMapButton', function(){
    $this = $(this);
    index = $this.data('index');
    points[index].onMap = false;
    myMap.geoObjects.remove(points[index].geoObject);
    points[index].element.find('input').attr('checked', false);
    deletePath();
});

// Нанести все точки на карту
$('#checkAll').click(function(){
    for (var i = 0; i < points.length; ++i) {
        points[i].onMap = true;
        myMap.geoObjects.add(points[i].geoObject);
        points[i].element.find('input').prop('checked', true);
    }
    deletePath();
});

// Удалить все точки с карты
$('#uncheckAll').click(function(){
    for (var i = 0; i < points.length; ++i) {
        points[i].onMap = false;
        myMap.geoObjects.remove(points[i].geoObject);
        points[i].element.find('input').prop('checked', false);
    }
    deletePath();
});

// Отправить на сервер точки для
// построения маршрута, построить
// маршрут
function buildPath() {
    var url = '';
    var emptyMap = true;
    for (var i = 0; i < points.length; ++i) {
        if (points[i].onMap === true) {
            emptyMap = false;
            url += i + ',';
        }
    }
    if (emptyMap === true) {
        alert('На карте нет точек!');
    } else {
        url = '/path?points=[' + url.substring(0, url.length - 1) + ']';
        $.getJSON(url, function(response){
            if (response.result === true) {
                // Удаляем старый путь
                deletePath();
                // Создаем новый путь
                path = new ymaps.GeoObject(
                    {
                        geometry: {
                            type: "LineString",
                            coordinates: response.points
                        }
                    }, {
                        strokeColor: "#FFFF00",
                        strokeWidth: 2
                    }
                );
                myMap.geoObjects.add(path);
                // Нумеруем точки
                for (var i = 0; i < response.indexes.length; ++i) {
                    var index = response.indexes[i];
                    points[index].geoObject.options.set('preset', 'islands#blueCircleIcon');
                    points[index].geoObject.properties.set('iconContent', '<span class="inside">' + (i + 1) + '</span>');
                }
            } else {
                alert('Что-то пошло не так!');
            }
        });
    }
}

// Удаление нарисованного
// маршрута (если он есть)
function deletePath() {
    if (path !== undefined) {
        myMap.geoObjects.remove(path);
        path = undefined;
    }
    for (var i = 0; i < points.length; ++i)
        points[i].geoObject.options.set('preset', 'islands#blueCircleDotIcon');
}