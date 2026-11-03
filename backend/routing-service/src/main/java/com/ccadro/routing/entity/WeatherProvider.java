package com.ccadro.routing.entity;

public interface WeatherProvider {

    WeatherCondition getWeather(Location location);
}
