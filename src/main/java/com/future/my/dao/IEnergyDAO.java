package com.future.my.dao;

import java.util.ArrayList;

import org.apache.ibatis.annotations.Mapper;

import com.future.my.vo.EnergyVO;

@Mapper
public interface IEnergyDAO {

	public ArrayList<EnergyVO> getCountryEnergy();
	
	public ArrayList<EnergyVO> getCityEnergy(EnergyVO vo);
	
	public ArrayList<EnergyVO> getCountyEnergy(EnergyVO vo);

}
