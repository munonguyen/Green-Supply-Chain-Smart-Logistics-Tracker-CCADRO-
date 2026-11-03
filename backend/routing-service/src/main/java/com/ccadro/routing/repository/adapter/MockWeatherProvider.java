package com.ccadro.routing.repository.adapter;

import com.ccadro.routing.entity.Location;
import com.ccadro.routing.entity.WeatherCondition;
import com.ccadro.routing.entity.WeatherProvider;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

@Component("mockWeatherProvider")
public class MockWeatherProvider implements WeatherProvider {

    private final AtomicReference<WeatherCondition> currentWeather = new AtomicReference<>(WeatherCondition.CLEAR);

    @Override
    public WeatherCondition getWeather(Location location) {
        return currentWeather.get();
    }

    public void setSimulatedWeather(WeatherCondition weather) {
        this.currentWeather.set(weather);
    }
}
