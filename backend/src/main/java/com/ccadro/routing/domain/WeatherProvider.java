package com.ccadro.routing.domain;

public interface WeatherProvider {

    WeatherCondition getWeather(Location location);
}
