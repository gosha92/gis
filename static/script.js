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
            balloonContent: '<b>' + point.name + '</b><br/>' + point.desc + '<br/>Глубина: ' + point.down + ' м<br/><button class="deletePointFromMapButton" data-index="' + index + '">Удалить точку</button>',
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
    // Карта
    myMap = new ymaps.Map('map', {
        center: [40, 69],
        zoom: 4,
        controls: ['typeSelector', 'rulerControl', 'zoomControl'],
        type: 'yandex#satellite'
    });
    // Получаем точки
    jQuery.getJSON('static/points.json', function(points) {
        for(var i = 0; i < points.length; ++i)
            createPoint(points[i])
    });
    // Кнопка "Построить маршрут"
    buildPathButton = new ymaps.control.Button({
        data: {
            content: 'Построить маршрут'
        },
        options: {
            maxWidth: 150,
            selectOnClick: false
        }
    });
    // Кнопка "Удалить маршрут"
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
    // Клик по карте
    // myMap.events.add('click', function(e) {
    //     var coords = e.get('coords');
    //     var lat = coords[0].toPrecision(6);
    //     var lon = coords[1].toPrecision(6);
    //     var name = 'Объект-' + (points.length + 1);
    //     var desc = 'Тестовый объект';
    //     var down = '' + Math.round(Math.random()*100) + 1;
    //     createPoint({
    //         lon: lon,
    //         lat: lat,
    //         name: name,
    //         desc: desc,
    //         down: down
    //     });
    //     $.getJSON('/add?name=' + name + '&desc=' + desc + '&lon=' + lon + '&lat=' + lat);
    //     $('#checkAll').trigger('click');
    // });
});

// Создание новой точки в базе,
// добавление точки в список
$pointNameInput = $('#pointNameInput');
$pointDescInput = $('#pointDescInput');
$pointLonInput = $('#pointLonInput');
$pointLatInput = $('#pointLatInput');
$pointDownInput = $('#pointDownInput');
$('#createPointButton').on('click', function(e) {
    e.preventDefault();
    var name = $pointNameInput.val();
    var desc = $pointDescInput.val();
    var lon = $pointLonInput.val();
    var lat = $pointLatInput.val();
    var down = $pointDownInput.val();
    $.getJSON('/add?name=' + name + '&desc=' + desc + '&lon=' + lon + '&lat=' + lat + '&down=' + down, function(response) {
        if (response.result === true) {
            createPoint({
                name: name,
                desc: desc,
                lon: lon,
                lat: lat,
                down: down
            });
            $pointNameInput.val('');
            $pointDescInput.val('');
            $pointLonInput.val('');
            $pointLatInput.val('');
            $pointDownInput.val('');
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