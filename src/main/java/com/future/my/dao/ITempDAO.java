package com.future.my.dao;

import java.util.ArrayList;

import org.apache.ibatis.annotations.Mapper;

import com.future.my.vo.TempVO;

@Mapper
public interface ITempDAO {

	public ArrayList<TempVO> getCountryTemp();
	
	public ArrayList<TempVO> getCityTemp(TempVO vo);
	
}
